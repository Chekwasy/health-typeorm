import { findDoctorBySpecialization } from "../../helpers/find-doctor-by-specialization";

import { findAvailableSlot } from "../../helpers/find-available-slot";

import { suggestAlternativeSlots } from "../../helpers/suggest-alternative-slots";

/**
 * =========================================
 * HANDLE AVAILABILITY
 * =========================================
 *
 * Purpose:
 * - check doctor slot availability
 * - support:
 *   - doctor name
 *   - specialization
 *   - date
 *   - time
 * - suggest alternatives
 * =========================================
 */

export async function handleAvailability({
  context,
}: {
  context: Record<string, any>;
}) {
  /**
   * =====================================
   * REQUIRE DOCTOR OR SPECIALIZATION
   * =====================================
   */

  if (!context.doctor_name && !context.specialization) {
    return {
      success: false,

      reply:
        "Which doctor or specialization would you like to check availability for?",
    };
  }

  /**
   * =====================================
   * FIND DOCTOR
   * =====================================
   */

  let doctor = context.doctor_name || null;

  /**
   * SEARCH BY SPECIALIZATION
   */

  if (!doctor && context.specialization) {
    doctor = await findDoctorBySpecialization(context.specialization);
  }

  /**
   * INVALID DOCTOR
   */

  if (!doctor) {
    return {
      success: false,

      reply: "I could not find the requested doctor or specialization.",
    };
  }

  /**
   * =====================================
   * REQUIRE DATE
   * =====================================
   */

  if (!context.appointment_date) {
    return {
      success: false,

      reply: "What date would you like to check availability for?",
    };
  }

  /**
   * =====================================
   * FIND SLOT
   * =====================================
   */

  const slot = await findAvailableSlot({
    doctor_id: context.doctor_id,

    appointment_date: new Date(context.appointment_date),

    time_period: context.time_period,

    appointment_time: context.appointment_time,
  });

  /**
   * =====================================
   * SLOT FOUND
   * =====================================
   */

  if (slot) {
    const start = new Date(slot.start_time);

    return {
      success: true,

      reply: `${doctor.title || "Dr"} ${doctor.first_name} ${
        doctor.last_name
      } is available.

Available slot:

Date:
${start.toLocaleDateString()}

Time:
${start.toLocaleTimeString()}`,
    };
  }

  /**
   * =====================================
   * NO SLOT FOUND
   * =====================================
   */

  const alternatives = await suggestAlternativeSlots({
    doctor_id: context.doctor_id,
  });

  /**
   * NO ALTERNATIVES
   */

  if (!alternatives.length) {
    return {
      success: false,

      reply: "No available slots were found for this doctor.",
    };
  }

  /**
   * =====================================
   * FORMAT ALTERNATIVES
   * =====================================
   */

  const altText = alternatives
    .map((item) => {
      const start = new Date(item.start_time);

      return `• ${start.toLocaleDateString()} ${start.toLocaleTimeString()}`;
    })
    .join("\n");

  /**
   * RESPONSE
   */

  return {
    success: false,

    reply: `${doctor.title || "Dr"} ${doctor.first_name} ${
      doctor.last_name
    } is unavailable at that time.

Available alternatives:
${altText}`,
  };
}
