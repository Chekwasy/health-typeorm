import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { findDoctorBySpecialization } from "../../helpers/find-doctor-by-specialization";

import { findAvailableSlot } from "../../helpers/find-available-slot";

import { suggestAlternativeSlots } from "../../helpers/suggest-alternative-slots";

import { resetConversationContext } from "../../helpers/reset-context";

import { BotConversation } from "@/entities/BotConversation";

/**
 * =========================================
 * CONVERT KEY TO DATE
 * =========================================
 *
 * Converts:
 *
 * 2026-05-26-14-30
 *
 * ->
 *
 * JS Date
 * =========================================
 */

function appointmentKeyToDate(key?: string | null) {
  if (!key) {
    return null;
  }

  const [year, month, day, hour, minute] = key.split("-").map(Number);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * =========================================
 * FORMAT DATE STRING
 * =========================================
 *
 * INPUT:
 *
 * yyyy-MM-dd-HH-mm
 *
 * OUTPUT:
 *
 * yyyy-MM-dd
 * =========================================
 */

function extractDateFromKey(key?: string | null) {
  if (!key) {
    return null;
  }

  return key.split("-").slice(0, 3).join("-");
}

/**
 * =========================================
 * EXTRACT HOUR
 * =========================================
 */

function extractHourFromKey(key?: string | null) {
  if (!key) {
    return null;
  }

  return Number(key.split("-")[3]);
}

/**
 * =========================================
 * HANDLE AVAILABILITY
 * =========================================
 *
 * Updated:
 * - string datetime support
 * - frontend JS dates
 * - no Date DB comparisons
 * - appointment key architecture
 * =========================================
 */

export async function handleAvailability({
  conversation,

  context,

  channel,
}: {
  conversation: BotConversation;

  context: Record<string, any>;

  channel: string;
}) {
  try {
    /**
     * =====================================
     * DB INIT
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
     * DIRECT DOCTOR
     */

    if (context.doctor_id) {
      doctor = await profileRepo.findOne({
        where: {
          id: context.doctor_id,
        },
      });
    }

    /**
     * SPECIALIZATION
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

        /**
         * STILL PASS DATE
         * TO HELPER
         */

        appointment_date: new Date(context.appointment_date),

        time_period: context.time_period,

        appointment_time: context.appointment_time,
      });

      /**
       * ===================================
       * SLOT FOUND
       * ===================================
       */

      if (slot) {
        /**
         * FRONTEND DATES
         */

        const startDate = appointmentKeyToDate(slot.start_time);

        const endDate = appointmentKeyToDate(slot.end_time);

        /**
         * DEBUG
         */

        console.log("AVAILABLE SLOT FOUND", {
          slot_id: slot.id,

          start_time: slot.start_time,

          end_time: slot.end_time,
        });

        /**
         * VOICE
         */

        if (channel === "VOICE") {
          return {
            success: true,

            slot: {
              ...slot,

              start_date: startDate,

              end_date: endDate,
            },

            reply: `${slot.doctor?.full_name || "The doctor"} is available on ${
              slot.formatted?.date || "that date"
            } from ${slot.formatted?.start_time || "the available time"} to ${
              slot.formatted?.end_time || "the end time"
            }.`,
          };
        }

        /**
         * WEB
         */

        return {
          success: true,

          slot: {
            ...slot,

            /**
             * FRONTEND DATES
             */

            start_date: startDate,

            end_date: endDate,
          },

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
       * ===================================
       * ALTERNATIVES
       * ===================================
       */

      const alternatives = await suggestAlternativeSlots({
        doctor_id: doctor.id,
      });

      /**
       * ===================================
       * NO ALTERNATIVES
       * ===================================
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
       * ===================================
       * TRANSFORM ALTERNATIVES
       * ===================================
       */

      const transformedAlternatives = alternatives.map((item: any) => ({
        ...item,

        start_date: appointmentKeyToDate(item.start_time),

        end_date: appointmentKeyToDate(item.end_time),
      }));

      /**
       * ===================================
       * VOICE ALTERNATIVES
       * ===================================
       */

      if (channel === "VOICE") {
        const voiceAlternatives = transformedAlternatives
          .slice(0, 3)
          .map((item: any) => {
            const start = item.start_date;

            const end = item.end_date;

            return `On ${start?.toLocaleDateString()} from ${start?.toLocaleTimeString()} to ${end?.toLocaleTimeString()}`;
          })
          .join(". ");

        return {
          success: false,

          alternatives: transformedAlternatives,

          reply: `${doctor.title || "Dr"} ${doctor.first_name || ""} ${
            doctor.last_name || ""
          } is unavailable at that requested time.

Available alternative slots include:

${voiceAlternatives}.`,
        };
      }

      /**
       * ===================================
       * WEB ALTERNATIVES
       * ===================================
       */

      const altText = transformedAlternatives
        .map((item: any) => {
          const start = item.start_date;

          const end = item.end_date;

          return `• ${start?.toLocaleDateString()}

Start:
${start?.toLocaleTimeString()}

End:
${end?.toLocaleTimeString()}`;
        })
        .join("\n\n");

      return {
        success: false,

        alternatives: transformedAlternatives,

        reply: `${doctor.title || "Dr"} ${doctor.first_name || ""} ${
          doctor.last_name || ""
        } is unavailable at that time.

Available Alternatives:
${altText}`,
      };
    }

    /**
     * =====================================
     * GENERAL AVAILABILITY
     * =====================================
     */

    const slots = await slotRepo.find({
      where: {
        is_booked: false,
      },
    });

    /**
     * =====================================
     * NO SLOTS
     * =====================================
     */

    if (!slots.length) {
      return {
        success: false,

        reply: "No available doctor slots were found.",
      };
    }

    /**
     * =====================================
     * FILTER DATE
     * =====================================
     *
     * appointment_date:
     *
     * yyyy-MM-dd
     * =====================================
     */

    let filteredSlots = slots.filter((slot) => {
      return extractDateFromKey(slot.start_time) === context.appointment_date;
    });

    /**
     * =====================================
     * FILTER TIME PERIOD
     * =====================================
     */

    if (context.time_period) {
      filteredSlots = filteredSlots.filter((slot) => {
        const hour = extractHourFromKey(slot.start_time);

        if (hour === null) {
          return false;
        }

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
     * =====================================
     * NO MATCH
     * =====================================
     */

    if (!filteredSlots.length) {
      return {
        success: false,

        reply: "No doctors are currently available for that date and time.",
      };
    }

    /**
     * =====================================
     * TRANSFORM SLOTS
     * =====================================
     */

    const transformedSlots = filteredSlots.map((slot: any) => ({
      ...slot,

      start_date: appointmentKeyToDate(slot.start_time),

      end_date: appointmentKeyToDate(slot.end_time),
    }));

    /**
     * =====================================
     * UNIQUE DOCTORS
     * =====================================
     */

    const uniqueDoctorIds = [
      ...new Set(transformedSlots.map((slot) => slot.doctor_id)),
    ];

    /**
     * =====================================
     * LOAD DOCTORS
     * =====================================
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
     * =====================================
     * VALID DOCTORS
     * =====================================
     */

    const validDoctors = doctors.filter(Boolean) as Profile[];

    /**
     * =====================================
     * NO VALID DOCTORS
     * =====================================
     */

    if (!validDoctors.length) {
      return {
        success: false,

        reply: "No doctors are currently available, please try again later.",
      };
    }

    /**
     * =====================================
     * VOICE
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

      await resetConversationContext(conversation);

      return {
        success: true,

        doctors: validDoctors,

        slots: transformedSlots,

        reply: `The following doctors are available on ${
          context.appointment_date
        }.

${doctorText}.`,
      };
    }

    /**
     * =====================================
     * WEB
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

      doctors: validDoctors,

      slots: transformedSlots,

      reply: `Available Doctors:

${doctorText}`,
    };
  } catch (err) {
    /**
     * =====================================
     * ERROR
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
