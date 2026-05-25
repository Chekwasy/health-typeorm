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
 * Improved:
 * - voice friendly responses
 * - text friendly responses
 * - conversational followups
 * - safer fallback handling
 * - alternative slot suggestions
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
   * CHANNEL
   * =====================================
   */

  const isVoice = conversation.channel === "VOICE";

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

      reply: isVoice
        ? "You already have 4 active appointments. Please complete or cancel one before booking another appointment."
        : "You already have 4 active appointments. Please complete or cancel one before booking another.",
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

      reply: isVoice
        ? "Which doctor or specialization would you like to book an appointment with?"
        : "Which doctor or specialization would you like to book?",
    };
  }

  /**
   * =====================================
   * FIND DOCTOR
   * =====================================
   */

  let doctor: any = context.doctor_name || null;

  /**
   * SPECIALIZATION SEARCH
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

      reply: isVoice
        ? "I could not find the requested doctor or specialization. Please try another doctor name or specialization."
        : "I could not find the requested doctor or specialization.",
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

      reply: isVoice
        ? "What date would you like to book the appointment for?"
        : "What date would you like to book the appointment?",
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

      reply: isVoice
        ? "You cannot book appointments in the past. Please choose another date."
        : "You cannot book appointments in the past.",
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

      reply: isVoice
        ? "What time would you prefer? You can say morning, afternoon, evening, or a specific time like 7 PM."
        : "What time would you prefer? Morning, afternoon, evening, or a specific time?",
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
     * GET ALTERNATIVES
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

        reply: isVoice
          ? `There are currently no available appointment slots for ${
              context.doctor_title || "Dr"
            } ${context.doctor_name || ""}.`
          : "No available slots were found for this doctor.",
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
     * =====================================
     * VOICE RESPONSE
     * =====================================
     */

    if (isVoice) {
      const voiceAlternatives = alternatives
        .slice(0, 3)
        .map((item) => {
          const start = new Date(item.start_time);

          return `on ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}`;
        })
        .join(". ");

      return {
        success: false,

        reply: `${context.doctor_title || "Dr"} ${
          context.doctor_name || "the doctor"
        } is unavailable at that requested time.

Available alternative slots include:

${voiceAlternatives}.`,
      };
    }

    /**
     * =====================================
     * TEXT RESPONSE
     * =====================================
     */

    return {
      success: false,

      reply: `${context.doctor_title || "Dr"} ${
        context.doctor_name || ""
      } is unavailable at that time.

You may consider booking any of the available alternatives:

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

    slot_id: slot.slot_id,

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

      reply: booking.message || "Failed to create appointment.",
    };
  }

  /**
   * =====================================
   * CLEAR MEMORY
   * =====================================
   */

  conversation.context = {};

  /**
   * =====================================
   * SLOT DATE
   * =====================================
   */

  const start = new Date(slot.start_time);

  /**
   * =====================================
   * VOICE SUCCESS
   * =====================================
   */

  if (isVoice) {
    return {
      success: true,

      reply: `Your appointment has been booked successfully with ${
        context.doctor_title || "Dr"
      } ${context.doctor_name || ""}.

The appointment is scheduled for ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}.

Reason for visit: ${context.reason || "general consultation"}.`,
    };
  }

  /**
   * =====================================
   * TEXT SUCCESS
   * =====================================
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

Reason:
${context.reason || "General consultation"}

Reference:
${booking.appointment?.id || "N/A"}`,
  };
}
