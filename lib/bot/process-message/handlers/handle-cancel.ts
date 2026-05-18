import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { cancelAppointment } from "../../helpers/cancel-appointment";

import { findAppointmentForCancellation } from "../../helpers/find-appointment-for-cancel";

import { findDoctorBySpecialization } from "../../helpers/find-doctor-by-specialization";

/**
 * =========================================
 * HANDLE CANCEL APPOINTMENT
 * =========================================
 *
 * Improved flow:
 * - supports conversational cancel
 * - supports appointment reference
 * - graceful fallback handling
 * - follow-up questions
 * - avoids hard failures
 * =========================================
 */

export async function handleCancel({
  user_id,

  context,

  channel,
}: {
  user_id: string;

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
   * CLEAN INVALID REFERENCES
   * =====================================
   *
   * Sometimes extraction may wrongly
   * capture words like:
   * "cancel"
   * "appointment"
   * etc
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
      /**
       * ATTEMPT CANCELLATION
       */

      const result = await cancelAppointment(appointmentReference, user_id);

      /**
       * SUCCESS
       */

      if (result.success) {
        if (channel !== "VOICE")
          return {
            success: true,

            reply: "Your appointment has been cancelled successfully.",
          };
        else {
          return {
            success: true,
            reply: "Your appointment has been cancelled successfully.",
          };
        }
      }

      /**
       * LOG FAILURE
       */

      console.log("REFERENCE CANCELLATION FAILED", {
        reference: appointmentReference,

        reason: result.message,
      });

      /**
       * FALL THROUGH
       *
       * Continue conversational search
       */
    } catch (err) {
      /**
       * LOG ERROR
       */

      console.error("REFERENCE CANCELLATION ERROR", err);

      /**
       * FALL THROUGH
       */
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
    if (channel !== "VOICE")
      return {
        success: false,

        reply:
          "Which appointment would you like to cancel? You can mention the doctor name, date and or time.",
      };
    else {
      return {
        success: false,
        reply:
          "Which appointment would you like to cancel? You can mention the doctor name, date and or time.",
      };
    }
  }

  /**
   * =====================================
   * FIND DOCTOR
   * =====================================
   */

  let doctor = null;

  /**
   * DOCTOR ID
   */

  if (context.doctor_id) {
    doctor = await profileRepo.findOne({
      where: {
        id: context.doctor_id,
      },
    });
  }

  /**
   * DOCTOR NAME
   */

  if (!doctor && context.doctor_name) {
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
     * MISSING DATE
     */

    if (!context.appointment_date) {
      if (channel !== "VOICE") {
        return {
          success: false,
          reply:
            "I could not find a matching appointment. What date was the appointment scheduled for?",
        };
      } else {
        return {
          success: false,
          reply:
            "I could not find a matching appointment. What date was the appointment scheduled for?",
        };
      }
    }

    /**
     * MISSING TIME
     */

    if (!context.appointment_time && !context.time_period) {
      if (channel !== "VOICE") {
        return {
          success: false,
          reply:
            "I could not find a matching appointment. What time was the appointment?",
        };
      } else {
        return {
          success: false,
          reply:
            "I could not find a matching appointment. What time was the appointment?",
        };
      }
    }

    /**
     * GENERAL FAILURE
     */

    if (channel !== "VOICE") {
      return {
        success: false,

        reply: "I could not find any matching active appointment to cancel.",
      };
    } else {
      return {
        success: false,
        reply: "I could not find any matching active appointment to cancel.",
      };
    }
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

    return {
      success: false,

      reply: `I found multiple matching appointments.

Please specify which one you want to cancel (copy and paste the reference of the appointment):

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
   * =====================================
   */

  const start = new Date(appointment.slot.start_time);

  /**
   * =====================================
   * SUCCESS RESPONSE
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
