/**
 * =========================================
 * EXTRACT RESCHEDULE TIME DATA
 * =========================================
 *
 * Handles:
 *
 * - move my 7pm appointment to 9pm
 * - move my morning appointment to friday evening
 * - reschedule from 10:30am to 2pm
 * - move my appointment to evening
 *
 * Returns:
 * - from_time_period
 * - from_appointment_time
 * - to_time_period
 * - to_appointment_time
 * =========================================
 */

export function extractRescheduleTimeData(rawMessage: string) {
  /**
   * =====================================
   * NORMALIZE
   * =====================================
   */

  const message = rawMessage.toLowerCase();

  /**
   * =====================================
   * DEFAULTS
   * =====================================
   */

  let from_time_period: string | null = null;

  let from_appointment_time: string | null = null;

  let to_time_period: string | null = null;

  let to_appointment_time: string | null = null;

  /**
   * =====================================
   * TIME PERIOD EXTRACTOR
   * =====================================
   */

  function extractTimePeriod(text: string) {
    if (text.includes("morning")) {
      return "morning";
    }

    if (text.includes("afternoon")) {
      return "afternoon";
    }

    if (text.includes("evening")) {
      return "evening";
    }

    if (text.includes("night")) {
      return "night";
    }

    return null;
  }

  /**
   * =====================================
   * TIME EXTRACTOR
   * =====================================
   */

  function extractTime(text: string) {
    /**
     * ===================================
     * 12-HOUR FORMAT
     * ===================================
     */

    const twelveHourMatch = text.match(
      /\b(1[0-2]|[1-9])(?::([0-5][0-9]))?\s?(am|pm)\b/i,
    );

    if (twelveHourMatch) {
      const rawHour = parseInt(twelveHourMatch[1]);

      const minutes = twelveHourMatch[2] || "00";

      const meridian = twelveHourMatch[3].toLowerCase();

      let hour = rawHour;

      /**
       * PM
       */

      if (meridian === "pm" && hour !== 12) {
        hour += 12;
      }

      /**
       * MIDNIGHT
       */

      if (meridian === "am" && hour === 12) {
        hour = 0;
      }

      return `${String(hour).padStart(2, "0")}:${minutes}`;
    }

    /**
     * ===================================
     * 24-HOUR FORMAT
     * ===================================
     */

    const twentyFourHourMatch = text.match(
      /\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/,
    );

    if (twentyFourHourMatch) {
      return `${twentyFourHourMatch[1].padStart(2, "0")}:${
        twentyFourHourMatch[2]
      }`;
    }

    return null;
  }

  /**
   * =====================================
   * AUTO PERIOD FROM TIME
   * =====================================
   */

  function inferPeriodFromTime(time: string | null) {
    if (!time) {
      return null;
    }

    const hour = parseInt(time.split(":")[0]);

    if (hour >= 6 && hour < 12) {
      return "morning";
    }

    if (hour >= 12 && hour < 17) {
      return "afternoon";
    }

    if (hour >= 17 && hour < 22) {
      return "evening";
    }

    return "night";
  }

  /**
   * =====================================
   * FROM SECTION
   * =====================================
   *
   * after:
   * - from
   * - my
   *
   * before:
   * - to
   * =====================================
   */

  const fromSectionMatch = message.match(/\b(from|my)\b(.*?)\bto\b/i);

  if (fromSectionMatch?.[2]) {
    const fromSection = fromSectionMatch[2].trim();

    /**
     * PERIOD
     */

    from_time_period = extractTimePeriod(fromSection);

    /**
     * TIME
     */

    from_appointment_time = extractTime(fromSection);

    /**
     * AUTO PERIOD
     */

    if (from_appointment_time && !from_time_period) {
      from_time_period = inferPeriodFromTime(from_appointment_time);
    }
  }

  /**
   * =====================================
   * TO SECTION
   * =====================================
   */

  const toSectionMatch = message.match(/\bto\b(.*)$/i);

  if (toSectionMatch?.[1]) {
    const toSection = toSectionMatch[1].trim();

    /**
     * PERIOD
     */

    to_time_period = extractTimePeriod(toSection);

    /**
     * TIME
     */

    to_appointment_time = extractTime(toSection);

    /**
     * AUTO PERIOD
     */

    if (to_appointment_time && !to_time_period) {
      to_time_period = inferPeriodFromTime(to_appointment_time);
    }
  }

  /**
   * =====================================
   * FALLBACK
   * =====================================
   *
   * Example:
   * move my appointment to 7pm
   * =====================================
   */

  if (!to_time_period && !to_appointment_time) {
    to_time_period = extractTimePeriod(message);

    to_appointment_time = extractTime(message);

    /**
     * AUTO PERIOD
     */

    if (to_appointment_time && !to_time_period) {
      to_time_period = inferPeriodFromTime(to_appointment_time);
    }
  }

  /**
   * =====================================
   * LOGGING
   * =====================================
   */

  console.log("RESCHEDULE TIME EXTRACTION", {
    rawMessage,

    from_time_period,

    from_appointment_time,

    to_time_period,

    to_appointment_time,
  });

  /**
   * =====================================
   * RETURN
   * =====================================
   */

  return {
    from_time_period,

    from_appointment_time,

    to_time_period,

    to_appointment_time,
  };
}
