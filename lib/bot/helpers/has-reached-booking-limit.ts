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
 * ACTIVE BOOKING LIMIT
 * =========================================
 *
 * Updated:
 * - string datetime support
 * - no JS Date DB comparison
 * - manual slot loading
 * =========================================
 */

export async function hasReachedBookingLimit(patient_id: string) {
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
    return false;
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

  const active = enrichedAppointments.filter((appointment) => {
    /**
     * ACTIVE STATUS
     */

    const valid =
      appointment.status === "PENDING" || appointment.status === "CONFIRMED";

    /**
     * SLOT DATE
     */

    const slotDate = extractDateFromKey(appointment.slot.start_time);

    /**
     * FUTURE ONLY
     */

    const future = slotDate! >= todayKey;

    return valid && future;
  });

  /**
   * =====================================
   * DEBUG
   * =====================================
   */

  console.log("ACTIVE BOOKING LIMIT CHECK", {
    patient_id,

    total_appointments: appointments.length,

    active_bookings: active.length,

    reached_limit: active.length >= 4,
  });

  /**
   * =====================================
   * RETURN
   * =====================================
   */

  return active.length >= 4;
}
