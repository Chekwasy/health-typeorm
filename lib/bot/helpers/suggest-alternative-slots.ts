import dbClient from "@/lib/db";

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
 * SUGGEST ALTERNATIVE SLOTS
 * =========================================
 *
 * Updated:
 * - string datetime support
 * - no JS Date DB comparison
 * - frontend JS dates
 * =========================================
 */

export async function suggestAlternativeSlots({
  doctor_id,
}: {
  doctor_id: string;
}) {
  /**
   * =====================================
   * DB INIT
   * =====================================
   */

  await dbClient.init();

  /**
   * =====================================
   * REPOSITORY
   * =====================================
   */

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
   * LOAD AVAILABLE SLOTS
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
   * EMPTY
   * =====================================
   */

  if (!slots.length) {
    console.log("NO AVAILABLE SLOTS FOUND", {
      doctor_id,
    });

    return [];
  }

  /**
   * =====================================
   * FUTURE SLOTS
   * =====================================
   */

  const futureSlots = slots.filter((slot) => {
    const slotDate = extractDateFromKey(slot.start_time);

    return slotDate! >= todayKey;
  });

  /**
   * =====================================
   * SORT EARLIEST FIRST
   * =====================================
   */

  futureSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

  /**
   * =====================================
   * LIMIT
   * =====================================
   */

  const limitedSlots = futureSlots.slice(0, 5);

  /**
   * =====================================
   * TRANSFORM
   * =====================================
   */

  const transformed = limitedSlots.map((slot) => ({
    ...slot,

    /**
     * FRONTEND DATES
     */

    start_date: appointmentKeyToDate(slot.start_time),

    end_date: appointmentKeyToDate(slot.end_time),
  }));

  /**
   * =====================================
   * DEBUG
   * =====================================
   */

  console.log("ALTERNATIVE SLOTS", {
    doctor_id,

    total_slots: slots.length,

    future_slots: futureSlots.length,

    returned: transformed.length,
  });

  /**
   * =====================================
   * RETURN
   * =====================================
   */

  return transformed;
}
