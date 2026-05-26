import * as chrono from "chrono-node";

/**
 * =========================================
 * TYPO NORMALIZATION
 * =========================================
 */

function normalizeDateTypos(message: string) {
  let text = message.toLowerCase();

  const replacements: Record<string, string> = {
    tmrw: "tomorrow",

    tomoro: "tomorrow",

    tommorrow: "tomorrow",

    tommorow: "tomorrow",

    toomoro: "tomorrow",

    "2moro": "tomorrow",

    todai: "today",

    nxt: "next",

    mon: "monday",

    tue: "tuesday",

    tues: "tuesday",

    wed: "wednesday",

    thur: "thursday",

    fri: "friday",

    sat: "saturday",

    sun: "sunday",
  };

  for (const [wrong, correct] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${wrong}\\b`, "gi");

    text = text.replace(regex, correct);
  }

  return text;
}

/**
 * =========================================
 * NORMALIZE DATE PHRASES
 * =========================================
 */

function normalizeDatePhrases(message: string) {
  let text = message;

  /**
   * NEXT TOMORROW
   */

  text = text.replace(/next tomorrow/gi, "in 2 days");

  /**
   * DAY AFTER TOMORROW
   */

  text = text.replace(/day after tomorrow|a day after tomorrow/gi, "in 2 days");

  /**
   * NEXT X DAYS
   */

  text = text.replace(/next (\d+) days?/gi, "in $1 days");

  /**
   * REMOVE EXTRA WORDS
   */

  text = text.replace(/\bfor\b/gi, "");

  return text.trim();
}

/**
 * =========================================
 * EXTRACT DATE PHRASE
 * =========================================
 */

function extractDatePhrase(message: string) {
  const patterns = [
    /**
     * TODAY
     * TOMORROW
     * IN X DAYS
     */

    /\b(today|tomorrow|in \d+ day|in \d+ days)\b/i,

    /**
     * NEXT WEEK MONDAY
     */

    /\bnext week (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,

    /**
     * NEXT MONDAY
     */

    /\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,

    /**
     * THIS MONDAY
     */

    /\bthis (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,

    /**
     * WEEKDAY
     */

    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,

    /**
     * 16 may 2026
     */

    /\b\d{1,2}\s?(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i,

    /**
     * 16 may
     */

    /\b\d{1,2}\s?(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,

    /**
     * may 16
     */

    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\s?(st|nd|rd|th)?\b/i,

    /**
     * SIMPLE DAY
     */

    /^(?:\s*)([1-9]|[12][0-9]|3[01])\s?(st|nd|rd|th)?(?:\s*)$/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);

    if (match) {
      return match[0];
    }
  }

  return null;
}

/**
 * =========================================
 * PARSE DATE PHRASE
 * =========================================
 *
 * IMPORTANT:
 * - NO CUSTOM REFERENCE DATE
 * - USE CHRONO DEFAULT UTC/NOW
 * - RETURN ONLY yyyy-MM-dd
 * =========================================
 */

function parseDatePhrase(phrase: string) {
  /**
   * NO PHRASE
   */

  if (!phrase) {
    return null;
  }

  /**
   * PARSE
   */

  const parsed = chrono.parse(phrase, undefined, {
    forwardDate: true,
  });

  /**
   * FAILED
   */

  if (!parsed.length) {
    return null;
  }

  /**
   * START COMPONENTS
   */

  const start = parsed[0].start;

  /**
   * DEBUGGING
   */

  console.log("CHRONO PARSED:", {
    phrase,

    refDate: parsed[0].refDate,

    jsDate: start.date(),

    iso: start.date().toISOString(),
  });

  /**
   * IMPORTANT:
   * USE PARSED COMPONENTS DIRECTLY
   *
   * Avoid:
   * - timezone shifts
   * - UTC conversion bugs
   * - JS Date madness
   */

  const year = start.get("year");

  const month = String(start.get("month")).padStart(2, "0");

  const day = String(start.get("day")).padStart(2, "0");

  /**
   * RETURN DATE ONLY
   */

  return `${year}-${month}-${day}`;
}

/**
 * =========================================
 * EXTRACT RESCHEDULE DATES
 * =========================================
 */

export function extractRescheduleDates(rawMessage: string) {
  /**
   * NORMALIZATION
   */

  let normalized = normalizeDateTypos(rawMessage);

  normalized = normalizeDatePhrases(normalized);

  const message = normalized.toLowerCase();

  /**
   * DEFAULTS
   */

  let from_date: string | null = null;

  let to_date: string | null = null;

  /**
   * FROM SECTION
   */

  const fromSectionMatch = message.match(/\bfrom\s+(.+?)(?=\s+\bto\b|$)/i);

  if (fromSectionMatch?.[1]) {
    const fromSection = fromSectionMatch[1].trim();

    const fromPhrase = extractDatePhrase(fromSection);

    from_date = parseDatePhrase(fromPhrase || "");
  }

  /**
   * TO SECTION
   */

  const toSectionMatch = message.match(/\bto\s+(.+)$/i);

  if (toSectionMatch?.[1]) {
    const toSection = toSectionMatch[1].trim();

    const toPhrase = extractDatePhrase(toSection);

    to_date = parseDatePhrase(toPhrase || "");
  }

  /**
   * FALLBACK
   */

  if (!from_date && !to_date) {
    const generalPhrase = extractDatePhrase(message);

    to_date = parseDatePhrase(generalPhrase || "");
  }

  /**
   * LOGGING
   */

  console.log("RESCHEDULE DATE EXTRACTION", {
    rawMessage,

    normalized,

    from_date,

    to_date,
  });

  /**
   * RETURN
   */

  return {
    from_date,

    to_date,
  };
}
