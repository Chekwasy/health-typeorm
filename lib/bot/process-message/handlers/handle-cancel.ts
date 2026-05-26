import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { cancelAppointment } from "../../helpers/cancel-appointment";

import { findAppointmentForCancellation } from "../../helpers/find-appointment-for-cancel";

import { findDoctorBySpecialization } from "../../helpers/find-doctor-by-specialization";

import { BotConversation } from "@/entities/BotConversation";

import { resetConversationContext } from "../../helpers/reset-context";

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
 * HANDLE CANCEL APPOINTMENT
 * =========================================
 *
 * Updated:
 * - string datetime support
 * - frontend JS dates
 * - slot key support
 * - no DB Date usage
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
   * =====================================
   * CLEAN REFERENCE
   * =====================================
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
   * TRY DIRECT REFERENCE
   * =====================================
   */

  if (appointmentReference) {
    try {
      const result = await cancelAppointment(appointmentReference, user_id);

      /**
       * SUCCESS
       */

      if (result.success) {
        return {
          success: true,

          reply: "Your appointment has been cancelled successfully.",
        };
      }

      /**
       * FAILED
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
   * VOICE FOLLOWUPS
   * =====================================
   */

  if (channel === "VOICE") {
    /**
     * BOTH MISSING
     */

    if (!context.appointment_date && !context.appointment_time) {
      return {
        success: false,

        reply:
          "Please mention the appointment date and time you want to cancel.",
      };
    }

    /**
     * DATE MISSING
     */

    if (!context.appointment_date) {
      return {
        success: false,

        reply: "Please mention the appointment date you want to cancel.",
      };
    }

    /**
     * TIME MISSING
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
   * REQUIRE CONTEXT
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

  let doctor: any = null;

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
   * FIND MATCHES
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
   * DEBUG
   * =====================================
   */

  console.log("CANCEL APPOINTMENT MATCHES", {
    total_matches: matches.length,

    appointment_date: context.appointment_date,

    appointment_time: context.appointment_time,
  });

  /**
   * =====================================
   * NO MATCHES
   * =====================================
   */

  if (!matches.length) {
    /**
     * VOICE
     */

    if (channel === "VOICE") {
      return {
        success: false,

        reply:
          "I could not find a matching appointment. Please mention the doctor, appointment date and time again.",
      };
    }

    /**
     * WEB
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

        const start = appointmentKeyToDate(appointment.slot?.start_time);

        /**
         * VOICE
         */

        if (channel === "VOICE") {
          return `Appointment ${index + 1} with ${
            matchedDoctor?.title || "Dr"
          } ${matchedDoctor?.first_name} ${
            matchedDoctor?.last_name
          } on ${start?.toLocaleDateString()} at ${start?.toLocaleTimeString()}`;
        }

        /**
         * WEB
         */

        return `${index + 1}. ${matchedDoctor?.title || "Dr"} ${
          matchedDoctor?.first_name
        } ${matchedDoctor?.last_name}

Date:
${start?.toLocaleDateString()}

Time:
${start?.toLocaleTimeString()}

Reference:
${appointment.id}`;
      }),
    );

    /**
     * VOICE
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
     * WEB
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
   * SINGLE MATCH
   * =====================================
   */

  const appointment = matches[0];

  /**
   * =====================================
   * CANCEL
   * =====================================
   */

  const result = await cancelAppointment(appointment.id, user_id);

  /**
   * =====================================
   * FAILURE
   * =====================================
   */

  if (!result.success) {
    return {
      success: false,

      reply: result.message,
    };
  }

  /**
   * =====================================
   * LOAD DOCTOR
   * =====================================
   */

  const matchedDoctor = await profileRepo.findOne({
    where: {
      id: appointment.doctor_id,
    },
  });

  /**
   * =====================================
   * FRONTEND DATE
   * =====================================
   */

  const start = appointmentKeyToDate(appointment.slot?.start_time);

  /**
   * =====================================
   * DEBUG
   * =====================================
   */

  console.log("CANCEL SUCCESS", {
    appointment_id: appointment.id,

    slot_id: appointment.slot_id,

    slot_time: appointment.slot?.start_time,
  });

  /**
   * =====================================
   * RESET CONTEXT
   * =====================================
   */

  await resetConversationContext(conversation);

  /**
   * =====================================
   * VOICE SUCCESS
   * =====================================
   */

  if (channel === "VOICE") {
    return {
      success: true,

      appointment,

      slot: {
        ...appointment.slot,

        start_date: start,
      },

      reply: `Your appointment with ${matchedDoctor?.title || "Dr"} ${
        matchedDoctor?.first_name
      } ${
        matchedDoctor?.last_name
      } on ${start?.toLocaleDateString()} at ${start?.toLocaleTimeString()} has been cancelled successfully.`,
    };
  }

  /**
   * =====================================
   * WEB SUCCESS
   * =====================================
   */

  return {
    success: true,

    appointment,

    slot: {
      ...appointment.slot,

      start_date: start,
    },

    reply: `Your appointment has been cancelled successfully.

Doctor:
${matchedDoctor?.title || "Dr"} ${matchedDoctor?.first_name} ${
      matchedDoctor?.last_name
    }

Date:
${start?.toLocaleDateString()}

Time:
${start?.toLocaleTimeString()}

Reference:
${appointment.id}`,
  };
}
