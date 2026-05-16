import dbClient from "@/lib/db";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { Profile } from "@/entities/Profile";

/**
 * =========================================
 * FIND AVAILABLE SLOT
 * =========================================
 *
 * Purpose:
 * - find best matching slot
 * - support:
 *   - exact time
 *   - time period
 *   - nearest time fallback
 * - return enriched slot data
 * - include:
 *   - doctor details
 *   - slot details
 *   - formatted metadata
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
  try {
    /**
     * =====================================
     * VALIDATION
     * =====================================
     */

    if (!doctor_id) {
      console.log("FIND SLOT FAILED: MISSING DOCTOR ID");

      return null;
    }

    /**
     * INVALID DATE
     */

    if (!appointment_date || isNaN(new Date(appointment_date).getTime())) {
      console.log("FIND SLOT FAILED: INVALID DATE");

      return null;
    }

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

    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    const profileRepo = dbClient.client.getRepository(Profile);

    /**
     * =====================================
     * LOAD DOCTOR
     * =====================================
     */

    const doctor = await profileRepo.findOne({
      where: {
        id: doctor_id,
      },
    });

    /**
     * INVALID DOCTOR
     */

    if (!doctor) {
      console.log("DOCTOR NOT FOUND", {
        doctor_id,
      });

      return null;
    }

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
     * NO SLOTS
     */

    if (!slots.length) {
      console.log("NO AVAILABLE SLOTS FOUND");

      return null;
    }

    /**
     * =====================================
     * FILTER SAME DAY
     * =====================================
     */

    const sameDaySlots = slots.filter((slot) => {
      const start = new Date(slot.start_time);

      return start >= startOfDay && start <= endOfDay;
    });

    /**
     * NO SAME DAY SLOT
     */

    if (!sameDaySlots.length) {
      console.log("NO SAME DAY SLOT FOUND");

      return null;
    }

    /**
     * =====================================
     * START FILTERING
     * =====================================
     */

    let filteredSlots = [...sameDaySlots];

    /**
     * =====================================
     * EXACT TIME SEARCH
     * =====================================
     */

    if (appointment_time) {
      /**
       * VALID TIME FORMAT
       */

      const validTime = /^([01]?\d|2[0-3]):([0-5]\d)$/.test(appointment_time);

      /**
       * INVALID TIME
       */

      if (!validTime) {
        console.log("INVALID TIME FORMAT", {
          appointment_time,
        });
      } else {
        /**
         * EXACT MATCH
         */

        const exactMatches = sameDaySlots.filter((slot) => {
          const slotDate = new Date(slot.start_time);

          const hour = String(slotDate.getHours()).padStart(2, "0");

          const minute = String(slotDate.getMinutes()).padStart(2, "0");

          const slotTime = `${hour}:${minute}`;

          return slotTime === appointment_time;
        });

        /**
         * FOUND EXACT MATCH
         */

        if (exactMatches.length) {
          filteredSlots = exactMatches;
        } else {

        /**
         * =================================
         * NEAREST TIME FALLBACK
         * =================================
         */
          const [requestedHour, requestedMinute] = appointment_time
            .split(":")
            .map(Number);

          const requestedTotal = requestedHour * 60 + requestedMinute;

          /**
           * SORT CLOSEST
           */

          filteredSlots = sameDaySlots.sort((a, b) => {
            const aDate = new Date(a.start_time);

            const bDate = new Date(b.start_time);

            const aTotal = aDate.getHours() * 60 + aDate.getMinutes();

            const bTotal = bDate.getHours() * 60 + bDate.getMinutes();

            return (
              Math.abs(aTotal - requestedTotal) -
              Math.abs(bTotal - requestedTotal)
            );
          });

          /**
           * LIMIT CLOSEST
           */

          filteredSlots = filteredSlots.slice(0, 3);
        }
      }
    }

    /**
     * =====================================
     * TIME PERIOD FILTER
     * =====================================
     */

    if (time_period && !appointment_time) {
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
     * SORT EARLIEST
     * =====================================
     */

    filteredSlots.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );

    /**
     * =====================================
     * NO MATCH
     * =====================================
     */

    const bestSlot = filteredSlots[0];

    if (!bestSlot) {
      console.log("NO FILTERED SLOT FOUND");

      return null;
    }

    /**
     * =====================================
     * FORMAT SLOT DATA
     * =====================================
     */

    const start = new Date(bestSlot.start_time);

    const end = new Date(bestSlot.end_time);

    /**
     * =====================================
     * BUILD RESPONSE OBJECT
     * =====================================
     */

    const result = {
      /**
       * SLOT
       */

      slot_id: bestSlot.id,

      doctor_id: doctor.id,

      is_booked: bestSlot.is_booked,

      /**
       * DOCTOR DETAILS
       */

      doctor: {
        id: doctor.id,

        title: doctor.title || "Dr",

        first_name: doctor.first_name,

        last_name: doctor.last_name,

        full_name: `${doctor.title || "Dr"} ${doctor.first_name} ${
          doctor.last_name
        }`,
      },

      /**
       * DATE
       */

      appointment_date: start,

      /**
       * SLOT TIME
       */

      start_time: bestSlot.start_time,

      end_time: bestSlot.end_time,

      /**
       * FORMATTED
       */

      formatted: {
        date: start.toLocaleDateString(),

        start_time: start.toLocaleTimeString(),

        end_time: end.toLocaleTimeString(),

        full: `${start.toLocaleDateString()} ${start.toLocaleTimeString()}`,
      },

      /**
       * MATCH INFO
       */

      matched_by: appointment_time
        ? "exact_or_nearest_time"
        : time_period
          ? "time_period"
          : "earliest_available",
    };

    /**
     * =====================================
     * LOGGING
     * =====================================
     */

    console.log("AVAILABLE SLOT FOUND", result);

    /**
     * =====================================
     * RETURN ENRICHED RESULT
     * =====================================
     */

    return result;
  } catch (err) {
    /**
     * =====================================
     * ERROR HANDLING
     * =====================================
     */

    console.error("FIND AVAILABLE SLOT ERROR", err);

    return null;
  }
}
