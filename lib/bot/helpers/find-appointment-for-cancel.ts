import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

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
 * EXTRACT TIME FROM KEY
 * =========================================
 *
 * INPUT:
 *
 * 2026-05-26-14-30
 *
 * OUTPUT:
 *
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
 * FIND APPOINTMENT FOR CANCELLATION
 * =========================================
 *
 * Updated:
 * - string datetime support
 * - no DB JS Date comparison
 * - frontend JS dates
 * - manual slot loading
 * =========================================
 */

export async function findAppointmentForCancellation({
  patient_id,

  doctor_id,

  appointment_date,

  appointment_time,
}: {
  patient_id: string;

  doctor_id?: string | null;

  appointment_date?: string | null;

  appointment_time?: string | null;
}) {
  /**
   * =====================================
   * DB INIT
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
   * GET APPOINTMENTS
   * =====================================
   */

  let appointments = await appointmentRepo.find({
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
    console.log("NO APPOINTMENTS FOUND");

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
   * ACTIVE FUTURE BOOKINGS
   * =====================================
   */

  let filtered = enrichedAppointments.filter((appointment) => {
    /**
     * ACTIVE STATUS
     */

    const active =
      appointment.status === "PENDING" || appointment.status === "CONFIRMED";

    /**
     * SLOT DATE
     */

    const slotDate = extractDateFromKey(appointment.slot.start_time);

    /**
     * FUTURE ONLY
     */

    const future = slotDate! >= todayKey;

    return active && future;
  });

  /**
   * =====================================
   * FILTER DOCTOR
   * =====================================
   */

  if (doctor_id) {
    filtered = filtered.filter(
      (appointment) => appointment.doctor_id === doctor_id,
    );
  }

  /**
   * =====================================
   * FILTER DATE
   * =====================================
   *
   * appointment_date:
   *
   * yyyy-MM-dd
   * =====================================
   */

  if (appointment_date) {
    filtered = filtered.filter((appointment) => {
      const slotDate = extractDateFromKey(appointment.slot.start_time);

      return slotDate === appointment_date;
    });
  }

  /**
   * =====================================
   * FILTER EXACT TIME
   * =====================================
   *
   * appointment_time:
   *
   * HH:mm
   * =====================================
   */

  if (appointment_time) {
    filtered = filtered.filter((appointment) => {
      const slotTime = extractTimeFromKey(appointment.slot.start_time);

      return slotTime === appointment_time;
    });
  }

  /**
   * =====================================
   * SORT EARLIEST
   * =====================================
   */

  filtered.sort((a, b) => a.slot.start_time.localeCompare(b.slot.start_time));

  /**
   * =====================================
   * DEBUG
   * =====================================
   */

  console.log("CANCELLATION SEARCH", {
    patient_id,

    doctor_id,

    appointment_date,

    appointment_time,

    total_appointments: appointments.length,

    total_slots: slots.length,

    matches: filtered.length,

    matched_slots: filtered.map((appointment) => ({
      appointment_id: appointment.id,

      slot_id: appointment.slot_id,

      start_time: appointment.slot.start_time,
    })),
  });

  /**
   * =====================================
   * RETURN
   * =====================================
   */

  return filtered;
}
