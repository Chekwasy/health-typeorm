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
 * 2026-05-26-14-30
 * ->
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
 * EXTRACT DATE
 * =========================================
 *
 * 2026-05-26-14-30
 * ->
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
 * EXTRACT TIME
 * =========================================
 *
 * 2026-05-26-14-30
 * ->
 * 14:30
 * =========================================
 */

function extractTimeFromKey(key?: string | null) {
  if (!key) {
    return null;
  }

  const parts = key.split("-");

  return `${parts[3]}:${parts[4]}`;
}

/**
 * =========================================
 * GET TIME PERIOD
 * =========================================
 */

function getTimePeriod(key?: string | null) {
  if (!key) {
    return null;
  }

  const parts = key.split("-");

  const hour = Number(parts[3]);

  if (hour < 12) {
    return "morning";
  }

  if (hour < 17) {
    return "afternoon";
  }

  return "evening";
}

/**
 * =========================================
 * HANDLE VIEW APPOINTMENTS
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
   * DB
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

  const slotRepo = dbClient.client.getRepository(DoctorSlot);

  /**
   * =====================================
   * TIME ONLY REQUIRES DATE
   * =====================================
   */

  if (context.appointment_time && !context.appointment_date) {
    return {
      success: false,

      reply:
        channel === "VOICE"
          ? "Please mention the appointment date together with the time."
          : "Please provide the appointment date for that time.",
    };
  }

  /**
   * =====================================
   * TODAY KEY
   * =====================================
   */

  const now = new Date();

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;

  /**
   * =====================================
   * LOAD APPOINTMENTS
   * =====================================
   */

  const rawAppointments = await appointmentRepo.find({
    where: {
      patient_id: user_id,
    },

    order: {
      created_at: "ASC",
    },
  });

  /**
   * =====================================
   * EMPTY
   * =====================================
   */

  if (!rawAppointments.length) {
    await resetConversationContext(conversation);

    return {
      success: true,

      reply:
        channel === "VOICE"
          ? "You currently do not have any appointments."
          : "You currently have no appointments.",
    };
  }

  /**
   * =====================================
   * SLOT IDS
   * =====================================
   */

  const slotIds = rawAppointments
    .map((appointment) => appointment.slot_id)
    .filter(Boolean);

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
   * ENRICH APPOINTMENTS
   * =====================================
   */

  const appointments = rawAppointments
    .map((appointment) => {
      const slot = slots.find((s) => s.id === appointment.slot_id);

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

  /**
   * =====================================
   * FILTER
   * =====================================
   */

  let filtered = appointments.filter((appointment) => {
    /**
     * ACTIVE ONLY
     */

    const activeStatuses = ["CONFIRMED", "PENDING"];

    const status = String(appointment.status).toUpperCase();

    if (!activeStatuses.includes(status)) {
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
     * FILTER:
     * DOCTOR
     */

    if (context.doctor_id && appointment.doctor_id !== context.doctor_id) {
      return false;
    }

    /**
     * FILTER:
     * DATE
     */

    /**
     * =====================================
     * NORMALIZE CONTEXT DATE
     * =====================================
     */

    let targetDate: string | null = null;

    if (context.appointment_date) {
      /**
       * JS DATE
       */

      if (context.appointment_date instanceof Date) {
        targetDate = context.appointment_date.toISOString().split("T")[0];
      } else if (typeof context.appointment_date === "string") {

      /**
       * ISO STRING
       */
        targetDate = context.appointment_date.split("T")[0];
      }
    }

    /**
     * =====================================
     * FILTER BY DATE
     * =====================================
     */

    if (targetDate && slotDate !== targetDate) {
      return false;
    }

    /**
     * FILTER:
     * EXACT TIME
     */

    if (context.appointment_time) {
      const slotTime = extractTimeFromKey(appointment.slot.start_time);

      if (slotTime !== context.appointment_time) {
        return false;
      }
    }

    /**
     * FILTER:
     * TIME PERIOD
     */

    if (!context.appointment_time && context.time_period) {
      const period = getTimePeriod(appointment.slot.start_time);

      if (period !== context.time_period) {
        return false;
      }
    }

    return true;
  });

  /**
   * =====================================
   * SORT
   * =====================================
   */

  filtered.sort((a, b) => a.slot.start_time.localeCompare(b.slot.start_time));

  /**
   * =====================================
   * EMPTY AFTER FILTER
   * =====================================
   */

  if (!filtered.length) {
    await resetConversationContext(conversation);

    return {
      success: true,

      reply:
        channel === "VOICE"
          ? "No appointments matched your request."
          : "No appointments matched your request.",
    };
  }

  /**
   * =====================================
   * BUILD RESPONSE
   * =====================================
   */

  const lines = await Promise.all(
    filtered.map(async (appointment, index) => {
      /**
       * DOCTOR
       */

      const doctor = await profileRepo.findOne({
        where: {
          id: appointment.doctor_id,
        },
      });

      /**
       * DATES
       */

      const start = appointmentKeyToDate(appointment.slot.start_time);

      const end = appointmentKeyToDate(appointment.slot.end_time);

      /**
       * NAME
       */

      const doctorName =
        `${doctor?.title || "Dr"} ${doctor?.first_name || ""} ${doctor?.last_name || ""}`.trim();

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

      appointments: filtered,

      reply: `You have ${filtered.length} appointment${
        filtered.length > 1 ? "s" : ""
      } matching your request.

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

    appointments: filtered,

    reply: `Your appointments:

${lines.join("\n\n")}`,
  };
}
