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
 * Purpose:
 * - cancel using reference
 * - cancel conversationally
 * - support:
 *   - doctor
 *   - date
 *   - time
 * - support multiple matches
 * =========================================
 */

export async function handleCancel({
  user_id,

  context,
}: {
  user_id: string;

  context: Record<string, any>;
}) {
  /**
   * =====================================
   * DIRECT REFERENCE CANCELLATION
   * =====================================
   */

  if (context.appointment_reference) {
    const result = await cancelAppointment(
      context.appointment_reference,
      user_id,
    );

    return {
      success: result.success,

      reply: result.success
        ? "Your appointment has been cancelled successfully."
        : result.message,
    };
  }

  /**
   * =====================================
   * FIND DOCTOR
   * =====================================
   */

  let doctor = context.doctor_name || null;

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
    /**
     * PROFILE REPOSITORY
     */

    const profileRepo = dbClient.client.getRepository(Profile);

    /**
     * BUILD OPTIONS
     */

    const options = await Promise.all(
      matches.map(async (appointment, index) => {
        const doctor = await profileRepo.findOne({
          where: {
            id: appointment.doctor_id,
          },
        });

        const start = new Date(appointment.slot.start_time);

        return `${index + 1}. ${doctor?.title || "Dr"} ${doctor?.first_name} ${
          doctor?.last_name
        }

Date:
${start.toLocaleDateString()}

Time:
${start.toLocaleTimeString()}`;
      }),
    );

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
   * FORMAT SUCCESS RESPONSE
   * =====================================
   */

  const profileRepo = dbClient.client.getRepository(Profile);

  const matchedDoctor = await profileRepo.findOne({
    where: {
      id: appointment.doctor_id,
    },
  });

  const start = new Date(appointment.slot.start_time);

  /**
   * SUCCESS RESPONSE
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
${start.toLocaleTimeString()}`,
  };
}
