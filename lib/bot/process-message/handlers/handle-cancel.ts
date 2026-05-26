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
 * NORMALIZE DATE
 * =========================================
 *
 * Converts:
 *
 * 2026-05-27T10:41:02.177Z
 *
 * ->
 *
 * 2026-05-27
 * =========================================
 */

function normalizeAppointmentDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  /**
   * DATE OBJECT
   */

  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }

  /**
   * ISO STRING
   */

  if (typeof value === "string") {
    return value.split("T")[0];
  }

  return null;
}

/**
 * =========================================
 * HANDLE CANCEL APPOINTMENT
 * =========================================
 *
 * Updated:
 * - uses ONLY appointment_date
 * - uses ONLY appointment_time
 * - supports time_period fallback
 * - supports DB string datetime
 * - frontend JS dates
 * - no JS Date DB comparison
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
        await resetConversationContext(conversation);

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
   * NORMALIZE DATE
   * =====================================
   */

  const normalizedAppointmentDate = normalizeAppointmentDate(
    context.appointment_date,
  );

  /**
   * =====================================
   * DEBUG DATE
   * =====================================
   */

  console.log("NORMALIZED CANCEL DATE", {
    raw: context.appointment_date,

    normalizedAppointmentDate,
  });

  /**
   * =====================================
   * VOICE FOLLOWUPS
   * =====================================
   */

  if (channel === "VOICE") {
    /**
     * DATE + TIME MISSING
     */

    if (!normalizedAppointmentDate && !context.appointment_time) {
      return {
        success: false,

        reply:
          "Please mention the appointment date and time you want to cancel.",
      };
    }

    /**
     * DATE MISSING
     */

    if (!normalizedAppointmentDate) {
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
    !normalizedAppointmentDate
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

  let matches = await findAppointmentForCancellation({
    patient_id: user_id,

    doctor_id: doctor?.id,

    appointment_date: normalizedAppointmentDate,

    appointment_time: context.appointment_time,
  });

  /**
   * =====================================
   * FILTER BY TIME PERIOD
   * =====================================
   *
   * Used ONLY when:
   *
   * - appointment_time missing
   * - time_period exists
   * =====================================
   */

  if (!context.appointment_time && context.time_period) {
    matches = matches.filter((appointment) => {
      const key = appointment.slot?.start_time;

      if (!key) {
        return false;
      }

      /**
       * 2026-05-26-14-30
       */

      const parts = key.split("-");

      const hour = Number(parts[3]);

      /**
       * MORNING
       */

      if (context.time_period === "morning") {
        return hour >= 6 && hour < 12;
      }

      /**
       * AFTERNOON
       */

      if (context.time_period === "afternoon") {
        return hour >= 12 && hour < 17;
      }

      /**
       * EVENING
       */

      if (context.time_period === "evening") {
        return hour >= 17 && hour < 22;
      }

      return true;
    });
  }

  /**
   * =====================================
   * DEBUG
   * =====================================
   */

  console.log("CANCEL APPOINTMENT MATCHES", {
    total_matches: matches.length,

    appointment_date: normalizedAppointmentDate,

    appointment_time: context.appointment_time,

    time_period: context.time_period,

    matches: matches.map((m) => ({
      id: m.id,

      slot_id: m.slot_id,

      slot_time: m.slot?.start_time,
    })),
  });

  /**
   * =====================================
   * NO MATCHES
   * =====================================
   */

  if (!matches.length) {
    if (channel === "VOICE") {
      return {
        success: false,

        reply:
          "I could not find a matching appointment. Please mention the doctor, appointment date and time again.",
      };
    }

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
