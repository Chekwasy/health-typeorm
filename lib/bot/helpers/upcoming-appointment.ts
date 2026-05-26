import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

import { DoctorSlot } from "@/entities/DoctorSlot";

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
 * UPCOMING APPOINTMENTS
 * =========================================
 *
 * Returns:
 * - future appointments
 * - active appointments
 *
 * Excludes:
 * - cancelled
 * - rejected
 * - failed
 *
 * Updated:
 * - string datetime support
 * - no JS Date DB comparison
 * - manual slot loading
 * - frontend JS dates
 * =========================================
 */

export async function getUpcomingAppointments(patient_id: string) {
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

  const slotRepo = dbClient.client.getRepository(DoctorSlot);

  /**
   * =====================================
   * TODAY KEY
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
   * LOAD APPOINTMENTS
   * =====================================
   */

  const appointments = await appointmentRepo.find({
    where: {
      patient_id,
    },
  });

  /**
   * =====================================
   * EMPTY
   * =====================================
   */

  if (!appointments.length) {
    console.log("NO APPOINTMENTS FOUND", {
      patient_id,
    });

    return [];
  }

  /**
   * =====================================
   * LOAD SLOT IDS
   * =====================================
   */

  const slotIds = appointments
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
   * ATTACH SLOT
   * =====================================
   */

  const enrichedAppointments = appointments
    .map((appointment) => {
      const slot = slots.find((s) => s.id === appointment.slot_id);

      /**
       * INVALID SLOT
       */

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
   * VALID ACTIVE STATUSES
   * =====================================
   */

  const activeStatuses = ["PENDING", "CONFIRMED"];

  /**
   * =====================================
   * FILTER FUTURE + ACTIVE
   * =====================================
   */

  const upcoming = enrichedAppointments.filter((appointment) => {
    /**
     * SLOT DATE
     */

    const slotDate = extractDateFromKey(appointment.slot.start_time);

    /**
     * FUTURE
     */

    const isFuture = slotDate! >= todayKey;

    /**
     * ACTIVE
     */

    const isActive = activeStatuses.includes(appointment.status);

    return isFuture && isActive;
  });

  /**
   * =====================================
   * SORT EARLIEST FIRST
   * =====================================
   */

  upcoming.sort((a, b) => a.slot.start_time.localeCompare(b.slot.start_time));

  /**
   * =====================================
   * TRANSFORM FOR FRONTEND
   * =====================================
   */

  const transformed = upcoming.map((appointment) => ({
    ...appointment,

    /**
     * FRONTEND DATES
     */

    slot: {
      ...appointment.slot,

      start_date: appointmentKeyToDate(appointment.slot.start_time),

      end_date: appointmentKeyToDate(appointment.slot.end_time),
    },
  }));

  /**
   * =====================================
   * LOGGING
   * =====================================
   */

  console.log("UPCOMING APPOINTMENTS", {
    patient_id,

    total_appointments: appointments.length,

    upcoming: transformed.length,
  });

  /**
   * =====================================
   * RETURN RESULT
   * =====================================
   */

  return transformed;
}
