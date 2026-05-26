import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { Appointment } from "@/entities/Appointment";

import { BotConversation } from "@/entities/BotConversation";

import { resetConversationContext } from "../../helpers/reset-context";
import { DoctorSlot } from "@/entities/DoctorSlot";

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
 * EXTRACT DATE FROM KEY
 * =========================================
 *
 * INPUT:
 *
 * 2026-05-26-14-30
 *
 * OUTPUT:
 *
 * 2026-05-26
 * =========================================
 */

function extractDateFromKey(key?: string | null) {
  if (!key) {
    return null;
  }

  return key.split("-").slice(0, 3).join("-");
}

/**
 * =========================================
 * HANDLE VIEW APPOINTMENTS
 * =========================================
 *
 * Updated:
 * - string datetime support
 * - no JS Date DB comparison
 * - frontend JS dates
 * - supports:
 *   - doctor filter
 *   - date filter
 *   - upcoming appointments
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
   * CURRENT DATE KEY
   * =====================================
   *
   * yyyy-MM-dd
   * =====================================
   */

  const now = new Date();

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;

  /**
   * =====================================
   * FETCH APPOINTMENTS
   * =====================================
   */

  let appointments = await appointmentRepo.find({
    where: {
      patient_id: user_id,
    },

    order: {
      created_at: "ASC",
    },
  });

  /**
   * =====================================
   * NO APPOINTMENTS
   * =====================================
   */

  if (!appointments.length) {
    await resetConversationContext(conversation);

    return {
      success: true,

      reply:
        channel === "VOICE"
          ? "You currently do not have any upcoming appointments."
          : "You currently have no upcoming appointments.",
    };
  }

  /**
   * =====================================
   * LOAD ALL SLOT IDS
   * =====================================
   */

  const slotIds = appointments
    .map((appointment) => appointment.slot_id)
    .filter(Boolean);

  /**
   * =====================================
   * LOAD SLOT REPOSITORY
   * =====================================
   */

  const slotRepo = dbClient.client.getRepository("DoctorSlot");

  /**
   * =====================================
   * LOAD SLOTS
   * =====================================
   */

  const slots = await slotRepo.find({
    where: slotIds.map((id) => ({
      id,
    })),
  });

  /**
   * =====================================
   * ATTACH SLOT
   * =====================================
   */

  const enrichedAppointments = appointments
    .map((appointment) => {
      const slot = slots.find((s: any) => s.id === appointment.slot_id);

      if (!slot) {
        return null;
      }

      return {
        ...appointment,

        slot,
      };
    })
    .filter(Boolean) as (Appointment & {
    slot: DoctorSlot;
  })[];

  appointments = enrichedAppointments;

  /**
   * =====================================
   * FILTER APPOINTMENTS
   * =====================================
   */

  appointments = appointments.filter((appointment: any) => {
    /**
     * INVALID SLOT
     */

    if (!appointment.slot) {
      return false;
    }

    /**
     * ALLOWED STATUS
     */

    const allowedStatuses = ["CONFIRMED", "PENDING"];

    const normalizedStatus = String(appointment.status).toUpperCase();

    /**
     * INVALID STATUS
     */

    if (!allowedStatuses.includes(normalizedStatus)) {
      return false;
    }

    /**
     * SLOT DATE
     */

    const slotDate = extractDateFromKey(appointment.slot.start_time);

    /**
     * FUTURE ONLY
     */

    if (slotDate! < todayKey) {
      return false;
    }

    /**
     * FILTER BY DATE
     */

    if (context.appointment_date && slotDate !== context.appointment_date) {
      return false;
    }

    /**
     * FILTER BY DOCTOR
     */

    if (context.doctor_id && appointment.doctor_id !== context.doctor_id) {
      return false;
    }

    return true;
  });

  /**
   * =====================================
   * SORT EARLIEST FIRST
   * =====================================
   */

  appointments.sort((a: any, b: any) =>
    a.slot.start_time.localeCompare(b.slot.start_time),
  );

  /**
   * =====================================
   * STILL EMPTY
   * =====================================
   */

  if (!appointments.length) {
    await resetConversationContext(conversation);

    return {
      success: true,

      reply:
        channel === "VOICE"
          ? "You currently do not have any upcoming appointments."
          : "You currently have no upcoming appointments.",
    };
  }

  /**
   * =====================================
   * BUILD RESPONSE
   * =====================================
   */

  const lines = await Promise.all(
    appointments.map(async (appointment: any, index) => {
      /**
       * LOAD DOCTOR
       */

      const doctor = await profileRepo.findOne({
        where: {
          id: appointment.doctor_id,
        },
      });

      /**
       * FRONTEND DATES
       */

      const start = appointmentKeyToDate(appointment.slot?.start_time);

      const end = appointmentKeyToDate(appointment.slot?.end_time);

      /**
       * DOCTOR NAME
       */

      const doctorName = `${doctor?.title || "Dr"} ${
        doctor?.first_name || ""
      } ${doctor?.last_name || ""}`.trim();

      /**
       * DEBUG
       */

      console.log("VIEW APPOINTMENT", {
        appointment_id: appointment.id,

        slot_start: appointment.slot?.start_time,
      });

      /**
       * VOICE
       */

      if (channel === "VOICE") {
        return `Appointment ${index + 1}.

With ${doctorName}.

For ${appointment.reason || "general consultation"}.

On ${start?.toLocaleDateString()}.

From ${start?.toLocaleTimeString()} to ${end?.toLocaleTimeString()}.

Status is ${String(appointment.status).toLowerCase().replaceAll("_", " ")}.`;
      }

      /**
       * WEB
       */

      return `${index + 1}. ${doctorName}

Reason:
${appointment.reason || "General consultation"}

Date:
${start?.toLocaleDateString()}

Start Time:
${start?.toLocaleTimeString()}

End Time:
${end?.toLocaleTimeString()}

Status:
${appointment.status}

Reference:
${appointment.id}`;
    }),
  );

  /**
   * =====================================
   * RESET CONTEXT
   * =====================================
   */

  await resetConversationContext(conversation);

  /**
   * =====================================
   * VOICE RESPONSE
   * =====================================
   */

  if (channel === "VOICE") {
    return {
      success: true,

      appointments,

      reply: `You have ${appointments.length} upcoming appointment${
        appointments.length > 1 ? "s" : ""
      }.

${lines.join("\n\n")}`,
    };
  }

  /**
   * =====================================
   * WEB RESPONSE
   * =====================================
   */

  return {
    success: true,

    appointments,

    reply: `Your appointments:

${lines.join("\n\n")}`,
  };
}
