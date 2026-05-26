import dbClient from "@/lib/db";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { Profile } from "@/entities/Profile";

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
 * EXTRACT HOUR FROM KEY
 * =========================================
 */

function extractHourFromKey(key?: string | null) {
  if (!key) {
    return null;
  }

  return Number(key.split("-")[3]);
}

/**
 * =========================================
 * FIND AVAILABLE SLOT
 * =========================================
 *
 * Updated:
 * - uses string datetime
 * - no JS Date DB comparison
 * - frontend ready dates
 * - supports:
 *   - exact time
 *   - nearest time
 *   - time period
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
     * DB INIT
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
     * =====================================
     */

    if (!doctor) {
      console.log("DOCTOR NOT FOUND", {
        doctor_id,
      });

      return null;
    }

    /**
     * =====================================
     * BUILD DATE KEY
     * =====================================
     *
     * yyyy-MM-dd
     * =====================================
     */

    const targetDate = `${appointment_date.getFullYear()}-${String(
      appointment_date.getMonth() + 1,
    ).padStart(2, "0")}-${String(appointment_date.getDate()).padStart(2, "0")}`;

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
     * NO SLOTS
     * =====================================
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
      return extractDateFromKey(slot.start_time) === targetDate;
    });

    /**
     * =====================================
     * DEBUG
     * =====================================
     */

    console.log("SAME DAY SLOT SEARCH", {
      doctor_id,

      targetDate,

      total_slots: slots.length,

      same_day_slots: sameDaySlots.length,
    });

    /**
     * =====================================
     * NO SAME DAY SLOT
     * =====================================
     */

    if (!sameDaySlots.length) {
      console.log("NO SAME DAY SLOT FOUND");

      return null;
    }

    /**
     * =====================================
     * FILTERING
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
       * VALIDATE HH:mm
       */

      const validTime = /^([01]?\d|2[0-3]):([0-5]\d)$/.test(appointment_time);

      /**
       * INVALID
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
          return extractTimeFromKey(slot.start_time) === appointment_time;
        });

        /**
         * FOUND EXACT
         */

        if (exactMatches.length) {
          filteredSlots = exactMatches;

          console.log("EXACT SLOT MATCH FOUND", {
            appointment_time,

            matches: exactMatches.length,
          });
        } else {

        /**
         * =================================
         * NEAREST FALLBACK
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
            const aTime = extractTimeFromKey(a.start_time);

            const bTime = extractTimeFromKey(b.start_time);

            if (!aTime || !bTime) {
              return 0;
            }

            const [aHour, aMinute] = aTime.split(":").map(Number);

            const [bHour, bMinute] = bTime.split(":").map(Number);

            const aTotal = aHour * 60 + aMinute;

            const bTotal = bHour * 60 + bMinute;

            return (
              Math.abs(aTotal - requestedTotal) -
              Math.abs(bTotal - requestedTotal)
            );
          });

          /**
           * TOP 3
           */

          filteredSlots = filteredSlots.slice(0, 3);

          console.log("NEAREST SLOT MATCH USED", {
            appointment_time,

            nearest: filteredSlots.map((slot) => slot.start_time),
          });
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
        const hour = extractHourFromKey(slot.start_time);

        if (hour === null) {
          return false;
        }

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

      console.log("TIME PERIOD FILTER", {
        time_period,

        matches: filteredSlots.length,
      });
    }

    /**
     * =====================================
     * SORT EARLIEST
     * =====================================
     */

    filteredSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

    /**
     * =====================================
     * BEST SLOT
     * =====================================
     */

    const bestSlot = filteredSlots[0];

    /**
     * NO SLOT
     * =====================================
     */

    if (!bestSlot) {
      console.log("NO FILTERED SLOT FOUND");

      return null;
    }

    /**
     * =====================================
     * FRONTEND DATES
     * =====================================
     */

    const startDate = appointmentKeyToDate(bestSlot.start_time);

    const endDate = appointmentKeyToDate(bestSlot.end_time);

    /**
     * =====================================
     * RESPONSE
     * =====================================
     */

    const result = {
      /**
       * SLOT
       */

      id: bestSlot.id,

      slot_id: bestSlot.id,

      doctor_id: doctor.id,

      is_booked: bestSlot.is_booked,

      /**
       * DOCTOR
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
       * RAW DB VALUES
       */

      start_time: bestSlot.start_time,

      end_time: bestSlot.end_time,

      /**
       * FRONTEND DATES
       */

      start_date: startDate,

      end_date: endDate,

      /**
       * FORMATTED
       */

      formatted: {
        date: startDate?.toLocaleDateString(),

        start_time: startDate?.toLocaleTimeString(),

        end_time: endDate?.toLocaleTimeString(),

        full: `${startDate?.toLocaleDateString()} ${startDate?.toLocaleTimeString()}`,
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

    console.log("AVAILABLE SLOT FOUND", {
      slot_id: result.slot_id,

      start_time: result.start_time,

      end_time: result.end_time,

      matched_by: result.matched_by,
    });

    /**
     * =====================================
     * RETURN
     * =====================================
     */

    return result;
  } catch (err) {
    /**
     * =====================================
     * ERROR
     * =====================================
     */

    console.error("FIND AVAILABLE SLOT ERROR", err);

    return null;
  }
}
