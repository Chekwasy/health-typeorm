import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { cancelAppointment } from "../../helpers/cancel-appointment";

import { findAppointmentForCancellation } from "../../helpers/find-appointment-for-cancel";

import { findDoctorBySpecialization } from "../../helpers/find-doctor-by-specialization";
import { BotConversation } from "@/entities/BotConversation";
import { resetConversationContext } from "../../helpers/reset-context";

/**
 * =========================================
 * HANDLE CANCEL APPOINTMENT
 * =========================================
 *
 * Improved flow:
 * - conversational cancellation
 * - voice optimized replies
 * - context-aware follow ups
 * - graceful fallback handling
 * - supports:
 *   - reference
 *   - doctor
 *   - date
 *   - time
 * =========================================
 */

export async function handleCancel({
  user_id,

  conversation,

  context,

  channel,
}: {
  user_id: string;

  conversation: BotConversation;

  context: Record<string, any>;

  channel: string;
}) {
  /**
   * =====================================
   * ENSURE DB CONNECTION
   * =====================================
   */

  await dbClient.init();

  /**
   * =====================================
   * PROFILE REPOSITORY
   * =====================================
   */

  const profileRepo = dbClient.client.getRepository(Profile);

  /**
   * =====================================
   * INVALID REFERENCES
   * =====================================
   */

  const invalidReferences = ["cancel", "appointment", "booking", "doctor"];

  /**
   * CLEAN REFERENCE
   */

  let appointmentReference = context.appointment_reference;

  if (
    appointmentReference &&
    invalidReferences.includes(String(appointmentReference).toLowerCase())
  ) {
    appointmentReference = null;
  }

  /**
   * =====================================
   * TRY DIRECT REFERENCE FIRST
   * =====================================
   */

  if (appointmentReference) {
    try {
      const result = await cancelAppointment(appointmentReference, user_id);

      /**
       * SUCCESS
       */

      if (result.success) {
        if (channel === "VOICE") {
          return {
            success: true,

            reply: "Your appointment has been cancelled successfully.",
          };
        }

        return {
          success: true,

          reply: "Your appointment has been cancelled successfully.",
        };
      }

      /**
       * FALL THROUGH
       */

      console.log("REFERENCE CANCELLATION FAILED", {
        reference: appointmentReference,

        reason: result.message,
      });
    } catch (err) {
      console.error("REFERENCE CANCELLATION ERROR", err);
    }
  }

  /**
   * =====================================
   * VOICE FOLLOW-UP HANDLING
   * =====================================
   *
   * Voice users should
   * naturally provide:
   * - date
   * - time
   *
   * since references are
   * hard to say verbally.
   * =====================================
   */

  if (channel === "VOICE") {
    /**
     * BOTH DATE + TIME MISSING
     */

    if (!context.appointment_date && !context.appointment_time) {
      return {
        success: false,

        reply:
          "Please mention the appointment date and time you want to cancel.",
      };
    }

    /**
     * DATE ONLY MISSING
     */

    if (!context.appointment_date) {
      return {
        success: false,

        reply: "Please mention the appointment date you want to cancel.",
      };
    }

    /**
     * TIME ONLY MISSING
     */

    if (!context.appointment_time && !context.time_period) {
      return {
        success: false,

        reply: "Please mention the appointment time you want to cancel.",
      };
    }
  }

  /**
   * =====================================
   * REQUIRE SOME CONTEXT
   * =====================================
   */

  if (
    !context.doctor_id &&
    !context.doctor_name &&
    !context.specialization &&
    !context.appointment_date
  ) {
    return {
      success: false,

      reply:
        "Which appointment would you like to cancel? You can mention the doctor name, date or time.",
    };
  }

  /**
   * =====================================
   * FIND DOCTOR
   * =====================================
   */

  let doctor = null;

  /**
   * BY ID
   */

  if (context.doctor_id) {
    doctor = await profileRepo.findOne({
      where: {
        id: context.doctor_id,
      },
    });
  }

  /**
   * BY SPECIALIZATION
   */

  if (!doctor && context.specialization) {
    doctor = await findDoctorBySpecialization(context.specialization);
  }

  /**
   * =====================================
   * FIND MATCHING APPOINTMENTS
   * =====================================
   */

  const matches = await findAppointmentForCancellation({
    patient_id: user_id,

    doctor_id: doctor?.id,

    appointment_date: context.appointment_date,

    appointment_time: context.appointment_time,
  });

  /**
   * =====================================
   * NO MATCH FOUND
   * =====================================
   */

  if (!matches.length) {
    /**
     * VOICE FRIENDLY
     */

    if (channel === "VOICE") {
      return {
        success: false,

        reply:
          "I could not find a matching appointment. Please mention the doctor, appointment date and time again.",
      };
    }

    /**
     * WEB/TEXT
     */

    return {
      success: false,

      reply: "I could not find any matching active appointment to cancel.",
    };
  }

  /**
   * =====================================
   * MULTIPLE MATCHES
   * =====================================
   */

  if (matches.length > 1) {
    const options = await Promise.all(
      matches.map(async (appointment, index) => {
        const matchedDoctor = await profileRepo.findOne({
          where: {
            id: appointment.doctor_id,
          },
        });

        const start = new Date(appointment.slot.start_time);

        /**
         * VOICE FORMAT
         */

        if (channel === "VOICE") {
          return `Appointment ${index + 1} with ${
            matchedDoctor?.title || "Dr"
          } ${matchedDoctor?.first_name} ${
            matchedDoctor?.last_name
          } on ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}`;
        }

        /**
         * WEB FORMAT
         */

        return `${index + 1}. ${matchedDoctor?.title || "Dr"} ${
          matchedDoctor?.first_name
        } ${matchedDoctor?.last_name}

Date:
${start.toLocaleDateString()}

Time:
${start.toLocaleTimeString()}

Reference:
${appointment.id}`;
      }),
    );

    /**
     * VOICE RESPONSE
     */

    if (channel === "VOICE") {
      return {
        success: false,

        reply: `I found multiple appointments matching your request.

${options.join(". ")}.

Please mention the appointment date and time you want to cancel.`,
      };
    }

    /**
     * WEB RESPONSE
     */

    return {
      success: false,

      reply: `I found multiple matching appointments.

Please specify which one you want to cancel:

${options.join("\n\n")}`,
    };
  }

  /**
   * =====================================
   * SINGLE MATCH FOUND
   * =====================================
   */

  const appointment = matches[0];

  /**
   * CANCEL APPOINTMENT
   */

  const result = await cancelAppointment(appointment.id, user_id);

  /**
   * FAILURE
   */

  if (!result.success) {
    return {
      success: false,

      reply: result.message,
    };
  }

  /**
   * =====================================
   * GET DOCTOR
   * =====================================
   */

  const matchedDoctor = await profileRepo.findOne({
    where: {
      id: appointment.doctor_id,
    },
  });

  /**
   * SLOT DATE
   */

  const start = new Date(appointment.slot.start_time);

  resetConversationContext(conversation);

  /**
   * =====================================
   * VOICE SUCCESS
   * =====================================
   */

  if (channel === "VOICE") {
    return {
      success: true,

      reply: `Your appointment with ${matchedDoctor?.title || "Dr"} ${
        matchedDoctor?.first_name
      } ${
        matchedDoctor?.last_name
      } on ${start.toLocaleDateString()} at ${start.toLocaleTimeString()} has been cancelled successfully.`,
    };
  }

  /**
   * =====================================
   * WEB SUCCESS
   * =====================================
   */

  return {
    success: true,

    reply: `Your appointment has been cancelled successfully.

Doctor:
${matchedDoctor?.title || "Dr"} ${matchedDoctor?.first_name} ${
      matchedDoctor?.last_name
    }

Date:
${start.toLocaleDateString()}

Time:
${start.toLocaleTimeString()}

Reference:
${appointment.id}`,
  };
}
