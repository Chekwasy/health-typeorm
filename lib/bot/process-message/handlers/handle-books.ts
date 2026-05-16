import { BotConversation } from "@/entities/BotConversation";

import { createAppointment } from "../../helpers/create-appointment";

import { findAvailableSlot } from "../../helpers/find-available-slot";

import { findDoctorBySpecialization } from "../../helpers/find-doctor-by-specialization";

import { hasReachedBookingLimit } from "../../helpers/has-reached-booking-limit";

import { isPastDate } from "../../helpers/helpers";

import { suggestAlternativeSlots } from "../../helpers/suggest-alternative-slots";

/**
 * =========================================
 * HANDLE BOOK APPOINTMENT
 * =========================================
 *
 * Purpose:
 * - validate booking flow
 * - validate doctor/date/time
 * - allocate slots
 * - create appointment
 * - return conversational response
 * =========================================
 */

export async function handleBook({
  user_id,

  conversation,

  context,
}: {
  user_id: string;

  conversation: BotConversation;

  context: Record<string, any>;
}) {
  /**
   * =====================================
   * MAX ACTIVE BOOKINGS
   * =====================================
   */

  const limitReached = await hasReachedBookingLimit(user_id);

  /**
   * LIMIT REACHED
   */

  if (limitReached) {
    return {
      success: false,

      reply:
        "You already have 4 active appointments. Please complete or cancel one before booking another.",
    };
  }

  /**
   * =====================================
   * REQUIRE DOCTOR
   * =====================================
   */

  if (!context.doctor_name && !context.specialization) {
    return {
      success: false,

      reply: "Which doctor or specialization would you like to book?",
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

      reply: "What date would you like to book the appointment?",
    };
  }

  /**
   * =====================================
   * PREVENT PAST DATE
   * =====================================
   */

  if (isPastDate(new Date(context.appointment_date))) {
    return {
      success: false,

      reply: "You cannot book appointments in the past.",
    };
  }

  /**
   * =====================================
   * REQUIRE TIME
   * =====================================
   */

  if (!context.time_period && !context.appointment_time) {
    return {
      success: false,

      reply:
        "What time would you prefer? Morning, afternoon, evening, 7am, 14:00?, noon, etc.",
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
   * SLOT NOT FOUND
   * =====================================
   */

  if (!slot) {
    /**
     * GET ALTERNATIVE SLOTS
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
     * FORMAT ALTERNATIVES
     */

    const altText = alternatives
      .map((item) => {
        const start = new Date(item.start_time);

        return `• ${start.toLocaleDateString()} ${start.toLocaleTimeString()}`;
      })
      .join("\n");

    return {
      success: false,

      reply: `${context.doctor_title || "Dr"} ${context.doctor_name} is unavailable at that time.

Available alternatives:
${altText}`,
    };
  }

  /**
   * =====================================
   * CREATE APPOINTMENT
   * =====================================
   */

  const booking = await createAppointment({
    patient_id: user_id,

    doctor_id: context.doctor_id,

    slot_id: slot.id,

    reason: context.reason || "General consultation",
  });

  /**
   * =====================================
   * BOOKING FAILED
   * =====================================
   */

  if (!booking.success) {
    return {
      success: false,

      reply: booking.message,
    };
  }

  /**
   * =====================================
   * CLEAR MEMORY
   * =====================================
   *
   * Since booking completed.
   */

  conversation.context = {};

  /**
   * =====================================
   * FORMAT SUCCESS
   * =====================================
   */

  const start = new Date(slot.start_time);

  /**
   * SUCCESS RESPONSE
   */

  return {
    success: true,

    reply: `Appointment booked successfully 🎉

Doctor:
${context.doctor_title || "Dr"} ${context.doctor_name}

Date:
${start.toLocaleDateString()}

Time:
${start.toLocaleTimeString()}

Reference:
${booking.appointment?.id || "N/A"}`,
  };
}
