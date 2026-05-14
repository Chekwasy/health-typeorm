import dbClient from "@/lib/db";

import { BotConversation } from "@/entities/BotConversation";

import { Profile } from "@/entities/Profile";

import { extractMessage } from "./extract";

import {
  cancelAppointment,
  createAppointment,
  findAvailableSlot,
  findDoctorByName,
  findDoctorBySpecialization,
  getUpcomingAppointments,
  hasReachedBookingLimit,
  isPastDate,
  suggestAlternativeSlots,
  findAppointmentForCancellation,
} from "./helpers";

/**
 * =========================================
 * PROCESS BOT MESSAGE
 * =========================================
 */

export async function processMessage({
  user_id,

  message,

  channel = "WEB",
}: {
  user_id: string;

  message: string;

  channel?: string;
}) {
  /**
   * =====================================
   * ENSURE DB CONNECTION
   * =====================================
   */

  await dbClient.init();

  /**
   * =====================================
   * CONVERSATION REPOSITORY
   * =====================================
   */

  const conversationRepo = dbClient.client.getRepository(BotConversation);

  /**
   * =====================================
   * LOAD EXISTING CONVERSATION
   * =====================================
   */

  let conversation = await conversationRepo.findOne({
    where: {
      user_id,
    },
  });

  /**
   * =====================================
   * CREATE CONVERSATION IF NONE EXISTS
   * =====================================
   */

  if (!conversation) {
    /**
     * CREATE EXPIRY
     *
     * Conversation expires
     * after 10 minutes.
     */

    const expires = new Date();

    expires.setMinutes(expires.getMinutes() + 10);

    conversation = conversationRepo.create({
      user_id,

      channel: channel as any,

      context: {},

      expires_at: expires,
    });

    await conversationRepo.save(conversation);
  }

  /**
   * =====================================
   * CHECK CONVERSATION EXPIRY
   * =====================================
   *
   * If conversation expired,
   * reset memory/context.
   * =====================================
   */

  if (
    conversation.expires_at &&
    new Date() > new Date(conversation.expires_at)
  ) {
    console.log("BOT SESSION EXPIRED", {
      user_id,
    });

    /**
     * RESET MEMORY
     */

    conversation.context = {};

    await conversationRepo.save(conversation);
  }

  /**
   * =====================================
   * LOAD CURRENT CONTEXT
   * =====================================
   *
   * This stores temporary
   * conversational memory.
   * =====================================
   */

  const context: Record<string, any> = conversation.context || {};

  /**
   * =====================================
   * EXTRACT USER MESSAGE
   * =====================================
   *
   * Extract:
   * - intent
   * - doctor
   * - date
   * - time
   * - etc
   * =====================================
   */

  const extracted = extractMessage(message);

  console.log("PROCESS MESSAGE:", extracted);

  /**
   * =====================================
   * TOPIC SWITCHING
   * =====================================
   *
   * If user changes intent,
   * update active intent.
   * =====================================
   */

  if (extracted.intent !== "UNKNOWN" && extracted.intent !== "GREETING") {
    context.intent = extracted.intent;
  }

  /**
   * =====================================
   * MERGE NEW DATA INTO MEMORY
   * =====================================
   *
   * Preserve previous values
   * unless new ones exist.
   * =====================================
   */

  const updatedContext = {
    ...context,

    doctor_name: extracted.doctor_name || context.doctor_name,

    specialization: extracted.specialization || context.specialization,

    appointment_date: extracted.appointment_date || context.appointment_date,

    time_period: extracted.time_period || context.time_period,

    appointment_time: extracted.appointment_time || context.appointment_time,

    appointment_reference:
      extracted.appointment_reference || context.appointment_reference,

    reason: extracted.reason || context.reason,

    intent: extracted.intent !== "UNKNOWN" ? extracted.intent : context.intent,
  };

  /**
   * =====================================
   * SAVE UPDATED MEMORY
   * =====================================
   */

  conversation.context = updatedContext;

  /**
   * =====================================
   * EXTEND EXPIRY
   * =====================================
   *
   * Every new interaction
   * extends session by
   * another 10 minutes.
   * =====================================
   */

  const newExpiry = new Date();

  newExpiry.setMinutes(newExpiry.getMinutes() + 10);

  conversation.expires_at = newExpiry;

  /**
   * SAVE CHANGES
   */

  await conversationRepo.save(conversation);

  /**
   * =====================================
   * ACTIVE INTENT
   * =====================================
   */

  const activeIntent = updatedContext.intent;

  /**
   * =====================================
   * GREETING FLOW
   * =====================================
   */

  if (extracted.intent === "GREETING") {
    return {
      success: true,

      reply:
        "Hello 👋\n\nHow can I help you today?\n\nYou can:\n- Book appointment\n- View appointments\n- Cancel appointment\n- Check doctor availability",
    };
  }

  /**
   * =====================================
   * VIEW APPOINTMENTS FLOW
   * =====================================
   */

  if (activeIntent === "VIEW") {
    const appointments = await getUpcomingAppointments(user_id);

    /**
     * NO APPOINTMENTS
     */

    if (!appointments.length) {
      return {
        success: true,

        reply: "You currently have no upcoming appointments.",
      };
    }

    /**
     * PROFILE REPOSITORY
     */

    const profileRepo = dbClient.client.getRepository(Profile);

    /**
     * BUILD RESPONSE
     */

    const lines = await Promise.all(
      appointments.map(async (appointment, index) => {
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
${start.toLocaleTimeString()}

Reference:
${appointment.id}`;
      }),
    );

    return {
      success: true,

      reply: `Your upcoming appointments:\n\n${lines.join("\n\n")}`,
    };
  }

  /**
   * =====================================
   * CANCEL APPOINTMENT FLOW
   * =====================================
   */

  if (activeIntent === "CANCEL") {
    /**
     * ===================================
     * TRY DIRECT REFERENCE FIRST
     * ===================================
     */

    if (updatedContext.appointment_reference) {
      const result = await cancelAppointment(
        updatedContext.appointment_reference,
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
     * ===================================
     * FIND DOCTOR IF PROVIDED
     * ===================================
     */

    let doctor = null;

    /**
     * DOCTOR NAME SEARCH
     */

    if (updatedContext.doctor_name) {
      doctor = await findDoctorByName(updatedContext.doctor_name);
    }

    /**
     * SPECIALIZATION SEARCH
     */

    if (!doctor && updatedContext.specialization) {
      doctor = await findDoctorBySpecialization(updatedContext.specialization);
    }

    /**
     * ===================================
     * FIND MATCHING APPOINTMENTS
     * ===================================
     */

    const matches = await findAppointmentForCancellation({
      patient_id: user_id,

      doctor_id: doctor?.id,

      appointment_date: updatedContext.appointment_date,

      appointment_time: updatedContext.appointment_time,
    });

    /**
     * ===================================
     * NO MATCH FOUND
     * ===================================
     */

    if (!matches.length) {
      return {
        success: false,

        reply: "I could not find any matching active appointment to cancel.",
      };
    }

    /**
     * ===================================
     * MULTIPLE MATCHES
     * ===================================
     */

    if (matches.length > 1) {
      const profileRepo = dbClient.client.getRepository(Profile);

      const options = await Promise.all(
        matches.map(async (appointment, index) => {
          const doctor = await profileRepo.findOne({
            where: {
              id: appointment.doctor_id,
            },
          });

          const start = new Date(appointment.slot.start_time);

          return `${index + 1}. ${doctor?.title || "Dr"} ${
            doctor?.first_name
          } ${doctor?.last_name}

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
     * ===================================
     * SINGLE MATCH FOUND
     * ===================================
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
     * FORMAT RESPONSE
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

  /**
   * =====================================
   * AVAILABILITY FLOW
   * =====================================
   */

  if (activeIntent === "AVAILABILITY") {
    return {
      success: true,

      reply:
        "You can ask things like:\n\n- Book Dr Richard tomorrow evening\n- Need a skin doctor tomorrow\n- Show my appointments\n- Cancel my appointment",
    };
  }

  /**
   * =====================================
   * BOOK APPOINTMENT FLOW
   * =====================================
   */

  if (activeIntent === "BOOK") {
    /**
     * MAX ACTIVE BOOKINGS
     */

    const limitReached = await hasReachedBookingLimit(user_id);

    if (limitReached) {
      return {
        success: false,

        reply:
          "You already have 4 active appointments. Please complete or cancel one before booking another.",
      };
    }

    /**
     * REQUIRE DOCTOR
     */

    if (!updatedContext.doctor_name && !updatedContext.specialization) {
      return {
        success: false,

        reply: "Which doctor or specialization would you like to book?",
      };
    }

    /**
     * FIND DOCTOR
     */

    let doctor = null;

    /**
     * SEARCH BY NAME
     */

    if (updatedContext.doctor_name) {
      doctor = await findDoctorByName(updatedContext.doctor_name);
    }

    /**
     * SEARCH BY SPECIALIZATION
     */

    if (!doctor && updatedContext.specialization) {
      doctor = await findDoctorBySpecialization(updatedContext.specialization);
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
     * REQUIRE DATE
     */

    if (!updatedContext.appointment_date) {
      return {
        success: false,

        reply: "What date would you like to book the appointment?",
      };
    }

    /**
     * PREVENT PAST BOOKINGS
     */

    if (isPastDate(new Date(updatedContext.appointment_date))) {
      return {
        success: false,

        reply: "You cannot book appointments in the past.",
      };
    }

    /**
     * REQUIRE TIME PERIOD
     */

    if (!updatedContext.time_period) {
      return {
        success: false,

        reply:
          "What time would you prefer? Morning, afternoon, evening, 7am, 14:00?, noon, etc.",
      };
    }

    /**
     * FIND AVAILABLE SLOT
     */

    const slot = await findAvailableSlot({
      doctor_id: doctor.id,

      appointment_date: new Date(updatedContext.appointment_date),

      time_period: updatedContext.time_period,
    });

    /**
     * SLOT NOT FOUND
     */

    if (!slot) {
      /**
       * GET ALTERNATIVES
       */

      const alternatives = await suggestAlternativeSlots({
        doctor_id: doctor.id,
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

        reply: `${doctor.title || "Dr"} ${doctor.first_name} ${
          doctor.last_name
        } is unavailable at that time.

      Available alternatives:
      ${altText}`,
      };
    }

    /**
     * CREATE APPOINTMENT
     */

    const booking = await createAppointment({
      patient_id: user_id,

      doctor_id: doctor.id,

      slot_id: slot.id,

      reason: updatedContext.reason || "General consultation",
    });

    /**
     * BOOKING FAILED
     */

    if (!booking.success) {
      return {
        success: false,

        reply: booking.message,
      };
    }

    /**
     * CLEAR MEMORY
     *
     * Since booking completed.
     */

    conversation.context = {};

    await conversationRepo.save(conversation);

    /**
     * FORMAT SUCCESS
     */

    const start = new Date(slot.start_time);

    return {
      success: true,

      reply: `Appointment booked successfully 🎉

      Doctor:
      ${doctor.title || "Dr"} ${doctor.first_name} ${doctor.last_name}

      Date:
      ${start.toLocaleDateString()}

      Time:
      ${start.toLocaleTimeString()}

      Reference:
      ${booking.appointment?.id || "N/A"}`,
    };
  }

  /**
   * =====================================
   * FALLBACK RESPONSE
   * =====================================
   */

  return {
    success: false,

    reply:
      "Sorry, I did not fully understand your request.\n\nYou can ask things like:\n- Book Dr Richard tomorrow evening\n- Need a skin doctor tomorrow\n- Show my appointments\n- Cancel my appointment\n- Any slots available today?",
  };
}
