/**
 * =========================================
 * EXTRACT TIME PERIOD
 * =========================================
 */

export function extractTimeData(message: string) {
  /**
   * DEFAULTS
   */

  let time_period = null;

  let appointment_time = null;

  /**
   * PERIOD DETECTION
   */

  if (message.includes("morning")) {
    time_period = "morning";
  }

  if (message.includes("afternoon")) {
    time_period = "afternoon";
  }

  if (message.includes("evening")) {
    time_period = "evening";
  }

  if (message.includes("night")) {
    time_period = "night";
  }

  /**
   * =====================================
   * 12-HOUR FORMAT
   * =====================================
   *
   * Examples:
   * 5pm
   * 10:30am
   * =====================================
   */

  const twelveHourMatch = message.match(
    /\b(1[0-2]|[1-9])(?::([0-5][0-9]))?\s?(am|pm)\b/i,
  );

  if (twelveHourMatch) {
    const rawHour = parseInt(twelveHourMatch[1]);

    const minutes = twelveHourMatch[2] || "00";

    const meridian = twelveHourMatch[3].toLowerCase();

    let hour = rawHour;

    /**
     * PM CONVERSION
     */

    if (meridian === "pm" && hour !== 12) {
      hour += 12;
    }

    /**
     * AM MIDNIGHT
     */

    if (meridian === "am" && hour === 12) {
      hour = 0;
    }

    appointment_time = `${String(hour).padStart(2, "0")}:${minutes}`;
  }

  /**
   * =====================================
   * 24-HOUR FORMAT
   * =====================================
   *
   * Examples:
   * 14:00
   * 18:30
   * =====================================
   */

  const twentyFourHourMatch = message.match(
    /\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/,
  );

  if (twentyFourHourMatch) {
    appointment_time = `${twentyFourHourMatch[1].padStart(2, "0")}:${
      twentyFourHourMatch[2]
    }`;
  }

  /**
   * AUTO PERIOD FROM TIME
   */

  if (appointment_time && !time_period) {
    const hour = parseInt(appointment_time.split(":")[0]);

    if (hour >= 6 && hour < 12) {
      time_period = "morning";
    } else if (hour >= 12 && hour < 17) {
      time_period = "afternoon";
    } else if (hour >= 17 && hour < 22) {
      time_period = "evening";
    } else {
      time_period = "night";
    }
  }

  console.log("TIME EXTRACTION:", appointment_time, time_period);

  return {
    time_period,

    appointment_time,
  };
}
