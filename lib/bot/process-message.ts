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
  await dbClient.init();

  /**
   * =====================================
   * LOAD CONVERSATION
   * =====================================
   */

  const conversationRepo = dbClient.client.getRepository(BotConversation);

  let conversation = await conversationRepo.findOne({
    where: {
      user_id,
    },
  });

  /**
   * CREATE MEMORY
   */

  if (!conversation) {
    conversation = conversationRepo.create({
      user_id,

      channel: channel as any,

      context: {},
    });

    await conversationRepo.save(conversation);
  }

  /**
   * =====================================
   * EXISTING MEMORY
   * =====================================
   */

  const context: Record<string, any> = conversation.context || {};

  /**
   * =====================================
   * EXTRACT MESSAGE
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
   * reset conversational flow.
   * =====================================
   */

  if (extracted.intent !== "UNKNOWN" && extracted.intent !== "GREETING") {
    context.intent = extracted.intent;
  }

  /**
   * =====================================
   * MERGE CONTEXT
   * =====================================
   */

  const updatedContext = {
    ...context,

    /**
     * ONLY OVERWRITE
     * IF VALUE EXISTS
     */

    doctor_name: extracted.doctor_name || context.doctor_name,

    specialization: extracted.specialization || context.specialization,

    appointment_date: extracted.appointment_date || context.appointment_date,

    time_period: extracted.time_period || context.time_period,

    appointment_reference:
      extracted.appointment_reference || context.appointment_reference,

    reason: extracted.reason || context.reason,

    intent: extracted.intent !== "UNKNOWN" ? extracted.intent : context.intent,
  };

  /**
   * =====================================
   * SAVE MEMORY
   * =====================================
   */

  conversation.context = updatedContext;

  await conversationRepo.save(conversation);

  /**
   * =====================================
   * ACTIVE INTENT
   * =====================================
   */

  const activeIntent = updatedContext.intent;

  /**
   * =====================================
   * GREETING
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
   * VIEW APPOINTMENTS
   * =====================================
   */

  if (activeIntent === "VIEW") {
    const appointments = await getUpcomingAppointments(user_id);

    if (!appointments.length) {
      return {
        success: true,

        reply: "You currently have no upcoming appointments.",
      };
    }

    const profileRepo = dbClient.client.getRepository(Profile);

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
   * CANCEL APPOINTMENT
   * =====================================
   */

  if (activeIntent === "CANCEL") {
    /**
     * NEED REFERENCE
     */

    if (!updatedContext.appointment_reference) {
      return {
        success: false,

        reply: "Please provide the appointment reference you want to cancel.",
      };
    }

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
   * =====================================
   * AVAILABILITY
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
   * BOOK APPOINTMENT
   * =====================================
   */

  if (activeIntent === "BOOK") {
    /**
     * MAX LIMIT
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
     * NEED DOCTOR
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

    if (updatedContext.doctor_name) {
      doctor = await findDoctorByName(updatedContext.doctor_name);
    }

    /**
     * SPECIALIZATION
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
     * NEED DATE
     */

    if (!updatedContext.appointment_date) {
      return {
        success: false,

        reply: "What date would you like to book the appointment?",
      };
    }

    /**
     * PAST DATE
     */

    if (isPastDate(new Date(updatedContext.appointment_date))) {
      return {
        success: false,

        reply: "You cannot book appointments in the past.",
      };
    }

    /**
     * NEED TIME
     */

    if (!updatedContext.time_period) {
      return {
        success: false,

        reply: "What time would you prefer? Morning, afternoon, or evening?",
      };
    }

    /**
     * FIND SLOT
     */

    const slot = await findAvailableSlot({
      doctor_id: doctor.id,

      appointment_date: new Date(updatedContext.appointment_date),

      time_period: updatedContext.time_period,
    });

    /**
     * NO SLOT
     */

    if (!slot) {
      const alternatives = await suggestAlternativeSlots({
        doctor_id: doctor.id,
      });

      /**
       * NONE
       */

      if (!alternatives.length) {
        return {
          success: false,

          reply: "No available slots were found for this doctor.",
        };
      }

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
     * CREATE BOOKING
     */

    const booking = await createAppointment({
      patient_id: user_id,

      doctor_id: doctor.id,

      slot_id: slot.id,

      reason: updatedContext.reason || "General consultation",
    });

    /**
     * FAILED
     */

    if (!booking.success) {
      return {
        success: false,

        reply: booking.message,
      };
    }

    /**
     * RESET MEMORY
     */

    conversation.context = {};

    await conversationRepo.save(conversation);

    /**
     * SUCCESS
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
${booking.appointment?.id}`,
    };
  }

  /**
   * =====================================
   * FALLBACK
   * =====================================
   */

  return {
    success: false,

    reply:
      "Sorry, I did not fully understand your request.\n\nYou can ask things like:\n- Book Dr Richard tomorrow evening\n- Need a skin doctor tomorrow\n- Show my appointments\n- Cancel my appointment\n- Any slots available today?",
  };
}
