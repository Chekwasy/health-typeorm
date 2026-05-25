import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { Appointment } from "@/entities/Appointment";
import { BotConversation } from "@/entities/BotConversation";
import { resetConversationContext } from "../../helpers/reset-context";

/**
 * =========================================
 * HANDLE VIEW APPOINTMENTS
 * =========================================
 *
 * Features:
 * - uses conversational context
 * - supports:
 *   - specific date
 *   - doctor
 * - smart fallback ranges
 * - shows:
 *   - doctor
 *   - reason
 *   - start/end time
 *   - status
 *   - reference
 * - only shows:
 *   - CONFIRMED
 *   - PENDING
 * =========================================
 */

export async function handleView({
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
   * REPOSITORIES
   * =====================================
   */

  const appointmentRepo = dbClient.client.getRepository(Appointment);

  const profileRepo = dbClient.client.getRepository(Profile);

  /**
   * =====================================
   * CURRENT DATE
   * =====================================
   */

  const now = new Date();

  /**
   * =====================================
   * BUILD DATE RANGE
   * =====================================
   *
   * Priority:
   * 1. Context date
   * 2. End of week
   * 3. All future appointments
   * =====================================
   */

  let endDate: Date | null = null;

  /**
   * =====================================
   * CONTEXT DATE
   * =====================================
   */

  if (context.appointment_date) {
    endDate = new Date(context.appointment_date);

    endDate.setHours(23, 59, 59, 999);
  } else {
    /**
     * =====================================
     * FALLBACK END OF WEEK
     * =====================================
     */
    endDate = new Date();

    const currentDay = endDate.getDay();

    const remainingDays = 7 - currentDay;

    endDate.setDate(endDate.getDate() + remainingDays);

    endDate.setHours(23, 59, 59, 999);
  }

  /**
   * =====================================
   * FETCH APPOINTMENTS
   * =====================================
   */

  let appointments = await appointmentRepo.find({
    where: {
      patient_id: user_id,
    },

    relations: ["slot"],

    order: {
      created_at: "ASC",
    },
  });

  /**
   * =====================================
   * FILTER APPOINTMENTS
   * =====================================
   */

  appointments = appointments.filter((appointment) => {
    /**
     * INVALID SLOT
     */

    if (!appointment.slot) {
      return false;
    }

    /**
     * SLOT START
     */

    const start = new Date(appointment.slot.start_time);

    /**
     * FUTURE ONLY
     */

    if (start < now) {
      return false;
    }

    /**
     * =================================
     * ALLOWED STATUSES
     * =================================
     */

    const allowedStatuses = ["CONFIRMED", "PENDING"];

    /**
     * NORMALIZE STATUS
     */

    const normalizedStatus = String(appointment.status).toUpperCase();

    /**
     * INVALID STATUS
     */

    if (!allowedStatuses.includes(normalizedStatus)) {
      return false;
    }

    /**
     * RANGE FILTER
     */

    return start >= now && start <= endDate!;
  });

  /**
   * =====================================
   * FILTER BY DOCTOR
   * =====================================
   */

  if (context.doctor_id) {
    appointments = appointments.filter(
      (appointment) => appointment.doctor_id === context.doctor_id,
    );
  }

  /**
   * =====================================
   * NO APPOINTMENTS IN RANGE
   * =====================================
   *
   * FALLBACK:
   * Fetch all future appointments
   * =====================================
   */

  if (!appointments.length) {
    appointments = await appointmentRepo.find({
      where: {
        patient_id: user_id,
      },

      relations: ["slot"],

      order: {
        created_at: "ASC",
      },
    });

    /**
     * FILTER AGAIN
     */

    appointments = appointments.filter((appointment) => {
      /**
       * INVALID SLOT
       */

      if (!appointment.slot) {
        return false;
      }

      /**
       * SLOT START
       */

      const start = new Date(appointment.slot.start_time);

      /**
       * STATUS
       */

      const normalizedStatus = String(appointment.status).toUpperCase();

      /**
       * ALLOWED
       */

      const allowedStatuses = ["CONFIRMED", "PENDING"];

      return start >= now && allowedStatuses.includes(normalizedStatus);
    });
  }

  /**
   * =====================================
   * STILL EMPTY
   * =====================================
   */

  if (!appointments.length) {
    if (channel !== "VOICE") {
      resetConversationContext(conversation);
      return {
        success: true,
        reply: "You currently have no upcoming appointments.",
      };
    } else {
      resetConversationContext(conversation);
      return {
        success: true,
        reply: "You currently do not have any upcoming appointments.",
      };
    }
  }

  /**
   * =====================================
   * BUILD RESPONSE
   * =====================================
   */

  const lines = await Promise.all(
    appointments.map(async (appointment, index) => {
      /**
       * FIND DOCTOR
       */

      const doctor = await profileRepo.findOne({
        where: {
          id: appointment.doctor_id,
        },
      });

      /**
       * SLOT TIMES
       */

      const start = new Date(appointment.slot.start_time);

      const end = new Date(appointment.slot.end_time);

      /**
       * DOCTOR NAME
       */

      const doctorName = `${doctor?.title || "Dr"} ${
        doctor?.first_name || ""
      } ${doctor?.last_name || ""}`.trim();

      /**
       * =================================
       * VOICE RESPONSE
       * =================================
       */

      if (channel === "VOICE") {
        return `Appointment ${index + 1}.

With ${doctorName}.

For ${appointment.reason || "general consultation"}.

On ${start.toLocaleDateString()}.

From ${start.toLocaleTimeString()} to ${end.toLocaleTimeString()}.

Status is ${String(appointment.status).toLowerCase().replaceAll("_", " ")}.`;
      }

      /**
       * =================================
       * WEB/TEXT RESPONSE
       * =================================
       */

      return `${index + 1}. ${doctorName}

Reason:
${appointment.reason || "General consultation"}

Date:
${start.toLocaleDateString()}

Start Time:
${start.toLocaleTimeString()}

End Time:
${end.toLocaleTimeString()}

Status:
${appointment.status}

Reference:
${appointment.id}`;
    }),
  );

  /**
   * =====================================
   * FINAL RESPONSE
   * =====================================
   */
  resetConversationContext(conversation);
  if (channel === "VOICE") {
    return {
      success: true,

      reply: `You have ${appointments.length} upcoming appointment${
        appointments.length > 1 ? "s" : ""
      }.

${lines.join("\n\n")}`,
    };
  }

  /**
   * =====================================
   * DEFAULT WEB RESPONSE
   * =====================================
   */

  return {
    success: true,

    reply: `Your appointments:

${lines.join("\n\n")}`,
  };
}
