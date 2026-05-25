import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { findDoctorBySpecialization } from "../../helpers/find-doctor-by-specialization";

import { findAvailableSlot } from "../../helpers/find-available-slot";

import { suggestAlternativeSlots } from "../../helpers/suggest-alternative-slots";

/**
 * =========================================
 * HANDLE AVAILABILITY
 * =========================================
 *
 * Improved:
 * - voice friendly replies
 * - avoids undefined access
 * - conversational responses
 * - supports:
 *   - doctor availability
 *   - specialization availability
 *   - general availability
 * =========================================
 */

export async function handleAvailability({
  context,

  channel,
}: {
  context: Record<string, any>;

  channel: string;
}) {
  try {
    /**
     * =====================================
     * ENSURE DB CONNECTION
     * =====================================
     */

    await dbClient.init();

    /**
     * =====================================
     * REQUIRE DATE
     * =====================================
     */

    if (!context.appointment_date) {
      return {
        success: false,

        reply:
          channel === "VOICE"
            ? "What date would you like to check doctor availability for?"
            : "What date would you like to check availability for?",
      };
    }

    /**
     * =====================================
     * REPOSITORIES
     * =====================================
     */

    const profileRepo = dbClient.client.getRepository(Profile);

    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    /**
     * =====================================
     * FIND DOCTOR
     * =====================================
     */

    let doctor: any = null;

    /**
     * DIRECT DOCTOR ID
     */

    if (context.doctor_id) {
      doctor = await profileRepo.findOne({
        where: {
          id: context.doctor_id,
        },
      });
    }

    /**
     * SPECIALIZATION SEARCH
     */

    if (!doctor && context.specialization) {
      try {
        doctor = await findDoctorBySpecialization(context.specialization);
      } catch (err) {
        console.error("SPECIALIZATION LOOKUP ERROR", err);
      }
    }

    /**
     * =====================================
     * SPECIFIC DOCTOR FLOW
     * =====================================
     */

    if (doctor?.id) {
      /**
       * FIND SLOT
       */

      const slot = await findAvailableSlot({
        doctor_id: doctor.id,

        appointment_date: new Date(context.appointment_date),

        time_period: context.time_period,

        appointment_time: context.appointment_time,
      });

      /**
       * SLOT FOUND
       */

      if (slot) {
        /**
         * VOICE RESPONSE
         */

        if (channel === "VOICE") {
          return {
            success: true,

            reply: `${slot.doctor?.full_name || "The doctor"} is available on ${
              slot.formatted?.date || "that date"
            } from ${slot.formatted?.start_time || "the available time"} to ${
              slot.formatted?.end_time || "the end time"
            }.`,
          };
        }

        /**
         * WEB RESPONSE
         */

        return {
          success: true,

          reply: `${slot.doctor?.full_name || "Doctor"} is available.

Available Slot:

Date:
${slot.formatted?.date || "N/A"}

Start Time:
${slot.formatted?.start_time || "N/A"}

End Time:
${slot.formatted?.end_time || "N/A"}`,
        };
      }

      /**
       * =================================
       * ALTERNATIVES
       * =================================
       */

      const alternatives = await suggestAlternativeSlots({
        doctor_id: doctor.id,
      });

      /**
       * NO ALTERNATIVES
       */

      if (!alternatives || !alternatives.length) {
        return {
          success: false,

          reply:
            channel === "VOICE"
              ? `${doctor.title || "Dr"} ${doctor.first_name || ""} ${
                  doctor.last_name || ""
                } does not have any available slots currently.`
              : `No available slots were found for ${doctor.title || "Dr"} ${
                  doctor.first_name || ""
                } ${doctor.last_name || ""}.`,
        };
      }

      /**
       * =================================
       * VOICE ALTERNATIVES
       * =================================
       */

      if (channel === "VOICE") {
        const voiceAlternatives = alternatives
          .slice(0, 3)
          .map((item) => {
            const start = new Date(item.start_time);

            const end = new Date(item.end_time);

            return `On ${start.toLocaleDateString()} from ${start.toLocaleTimeString()} to ${end.toLocaleTimeString()}`;
          })
          .join(". ");

        return {
          success: false,

          reply: `${doctor.title || "Dr"} ${doctor.first_name || ""} ${
            doctor.last_name || ""
          } is unavailable at that requested time.

Available alternative slots include:

${voiceAlternatives}.`,
        };
      }

      /**
       * =================================
       * WEB ALTERNATIVES
       * =================================
       */

      const altText = alternatives
        .map((item) => {
          const start = new Date(item.start_time);

          const end = new Date(item.end_time);

          return `• ${start.toLocaleDateString()}

Start:
${start.toLocaleTimeString()}

End:
${end.toLocaleTimeString()}`;
        })
        .join("\n\n");

      return {
        success: false,

        reply: `${doctor.title || "Dr"} ${doctor.first_name || ""} ${
          doctor.last_name || ""
        } is unavailable at that time.

Available Alternatives:
${altText}`,
      };
    }

    /**
     * =====================================
     * GENERAL AVAILABILITY FLOW
     * =====================================
     */

    const slots = await slotRepo.find({
      where: {
        is_booked: false,
      },
    });

    /**
     * NO SLOTS
     */

    if (!slots.length) {
      return {
        success: false,

        reply: "No available doctor slots were found.",
      };
    }

    /**
     * =====================================
     * DATE RANGE
     * =====================================
     */

    const startOfDay = new Date(context.appointment_date);

    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(context.appointment_date);

    endOfDay.setHours(23, 59, 59, 999);

    /**
     * FILTER DATE
     */

    let filteredSlots = slots.filter((slot) => {
      const start = new Date(slot.start_time);

      return start >= startOfDay && start <= endOfDay;
    });

    /**
     * =====================================
     * FILTER TIME PERIOD
     * =====================================
     */

    if (context.time_period) {
      filteredSlots = filteredSlots.filter((slot) => {
        const hour = new Date(slot.start_time).getHours();

        if (context.time_period === "morning" && hour >= 6 && hour < 12) {
          return true;
        }

        if (context.time_period === "afternoon" && hour >= 12 && hour < 17) {
          return true;
        }

        if (context.time_period === "evening" && hour >= 17 && hour < 22) {
          return true;
        }

        if (context.time_period === "night" && (hour >= 22 || hour < 6)) {
          return true;
        }

        return false;
      });
    }

    /**
     * NO MATCHES
     */

    if (!filteredSlots.length) {
      return {
        success: false,

        reply:
          channel === "VOICE"
            ? "No doctors are currently available for that date and time."
            : "No doctors are currently available for that date and time.",
      };
    }

    /**
     * =====================================
     * UNIQUE DOCTOR IDS
     * =====================================
     */

    const uniqueDoctorIds = [
      ...new Set(filteredSlots.map((slot) => slot.doctor_id)),
    ];

    /**
     * LOAD DOCTORS
     */

    const doctors = await Promise.all(
      uniqueDoctorIds.map(async (doctor_id) => {
        return await profileRepo.findOne({
          where: {
            id: doctor_id,
          },
        });
      }),
    );

    /**
     * REMOVE NULLS
     */

    const validDoctors = doctors.filter(Boolean) as Profile[];

    /**
     * NO VALID DOCTORS
     */

    if (!validDoctors.length) {
      return {
        success: false,

        reply: "No doctors are currently available, please try again later.",
      };
    }

    /**
     * =====================================
     * VOICE RESPONSE
     * =====================================
     */

    if (channel === "VOICE") {
      const doctorText = validDoctors
        .slice(0, 5)
        .map(
          (doctor) =>
            `${doctor.title || "Dr"} ${doctor.first_name || ""} ${
              doctor.last_name || ""
            }`,
        )
        .join(", ");

      return {
        success: true,

        reply: `The following doctors are available on ${new Date(
          context.appointment_date,
        ).toLocaleDateString()}.

${doctorText}.`,
      };
    }

    /**
     * =====================================
     * WEB RESPONSE
     * =====================================
     */

    const doctorText = validDoctors
      .map((doctor) => {
        return `• ${doctor.title || "Dr"} ${doctor.first_name || ""} ${
          doctor.last_name || ""
        }`;
      })
      .join("\n");

    return {
      success: true,

      reply: `Available Doctors:

${doctorText}`,
    };
  } catch (err) {
    /**
     * =====================================
     * ERROR HANDLING
     * =====================================
     */

    console.error("HANDLE AVAILABILITY ERROR", err);

    return {
      success: false,

      reply:
        "Something went wrong while checking doctor availability, please try again later.",
    };
  }
}
