import dbClient from "@/lib/db";

import { DoctorSlot } from "@/entities/DoctorSlot";

/**
 * =========================================
 * FIND AVAILABLE SLOT
 * =========================================
 */

export async function findAvailableSlot({
  doctor_id,

  appointment_date,

  time_period,

  appointment_time,
}: {
  doctor_id: string;

  appointment_date: Date;

  time_period?: string | null;

  appointment_time?: string | null;
}) {
  /**
   * =====================================
   * ENSURE DB CONNECTION
   * =====================================
   */

  await dbClient.init();

  /**
   * =====================================
   * SLOT REPOSITORY
   * =====================================
   */

  const slotRepo = dbClient.client.getRepository(DoctorSlot);

  /**
   * =====================================
   * BUILD DAY RANGE
   * =====================================
   */

  const startOfDay = new Date(appointment_date);

  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(appointment_date);

  endOfDay.setHours(23, 59, 59, 999);

  /**
   * =====================================
   * FETCH AVAILABLE SLOTS
   * =====================================
   */

  const slots = await slotRepo.find({
    where: {
      doctor_id,

      is_booked: false,
    },
  });

  /**
   * =====================================
   * FILTER SAME DAY SLOTS
   * =====================================
   */

  const sameDaySlots = slots.filter((slot) => {
    const start = new Date(slot.start_time);

    return start >= startOfDay && start <= endOfDay;
  });

  /**
   * =====================================
   * START FILTERING
   * =====================================
   */

  let filteredSlots = sameDaySlots;

  /**
   * =====================================
   * EXACT TIME MATCH
   * =====================================
   *
   * Highest priority.
   *
   * Example:
   * 18:30
   * 14:00
   * =====================================
   */

  if (appointment_time) {
    filteredSlots = filteredSlots.filter((slot) => {
      const slotDate = new Date(slot.start_time);

      /**
       * SLOT TIME
       */

      const hour = String(slotDate.getHours()).padStart(2, "0");

      const minutes = String(slotDate.getMinutes()).padStart(2, "0");

      const slotTime = `${hour}:${minutes}`;

      return slotTime === appointment_time;
    });
  }

  /**
   * =====================================
   * FALLBACK TO TIME PERIOD
   * =====================================
   *
   * Only apply if:
   * - no exact time
   * - or exact time found nothing
   * =====================================
   */

  if (time_period && !filteredSlots.length) {
    filteredSlots = sameDaySlots.filter((slot) => {
      const hour = new Date(slot.start_time).getHours();

      /**
       * MORNING
       */

      if (time_period === "morning" && hour >= 6 && hour < 12) {
        return true;
      }

      /**
       * AFTERNOON
       */

      if (time_period === "afternoon" && hour >= 12 && hour < 17) {
        return true;
      }

      /**
       * EVENING
       */

      if (time_period === "evening" && hour >= 17 && hour < 22) {
        return true;
      }

      /**
       * NIGHT
       */

      if (time_period === "night" && (hour >= 22 || hour < 6)) {
        return true;
      }

      return false;
    });
  }

  /**
   * =====================================
   * SORT EARLIEST FIRST
   * =====================================
   */

  filteredSlots.sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  /**
   * =====================================
   * LOGGING
   * =====================================
   */

  console.log("SLOT SEARCH:", {
    doctor_id: doctor_id,

    requested_date: appointment_date,

    requested_time: appointment_time,

    requested_period: time_period,

    found: filteredSlots.length,
  });

  /**
   * =====================================
   * RETURN EARLIEST MATCH
   * =====================================
   */

  return filteredSlots[0] || null;
}
