import * as chrono from "chrono-node";

/**
 * =========================================
 * TYPO NORMALIZATION
 * =========================================
 */

function normalizeDateTypos(message: string) {
  let text = message.toLowerCase();

  /**
   * COMMON TYPO FIXES
   */

  const replacements: Record<string, string> = {
    tmrw: "tomorrow",

    tomoro: "tomorrow",

    tommorrow: "tomorrow",

    tommorow: "tomorrow",

    toomoro: "tomorrow",

    "2moro": "tomorrow",

    todai: "today",

    nxt: "next",

    "this week": "next sunday",

    mon: "monday",

    tue: "tuesday",

    tues: "tuesday",

    wed: "wednesday",

    thur: "thursday",

    fri: "friday",

    sat: "saturday",

    sun: "sunday",
  };

  /**
   * APPLY FIXES
   */

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

  text = text.replace(/next tomorrow/gi, "in 2 day");

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
  /**
   * DATE PATTERNS
   */

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

    /\b([1-9]|[12][0-9]|3[01])\s?(st|nd|rd|th)?\b(?!\s?(am|pm|\:))/i,
  ];

  /**
   * FIND FIRST MATCH
   */

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
 * NORMALIZE SIMPLE DAY
 * =========================================
 */

function normalizeSimpleDay(phrase: string) {
  const simpleDayMatch = phrase.match(
    /^([1-9]|[12][0-9]|3[01])\s?(st|nd|rd|th)?$/i,
  );

  /**
   * NOT SIMPLE
   */

  if (!simpleDayMatch) {
    return phrase;
  }

  /**
   * CURRENT DATE
   */

  const now = new Date();

  const day = Number(simpleDayMatch[1]);

  const month = now.toLocaleString("default", {
    month: "long",
  });

  const year = now.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * =========================================
 * PARSE DATE PHRASE
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
   * NORMALIZE SIMPLE DAY
   */

  phrase = normalizeSimpleDay(phrase);

  /**
   * PARSE
   */

  const parsed = chrono.parse(phrase, new Date());

  /**
   * FAILED
   */

  if (!parsed.length) {
    return null;
  }

  /**
   * EXTRACT DATE
   */

  const date = parsed[0].start.date();

  /**
   * REMOVE TIME
   */

  date.setHours(0, 0, 0, 0);

  return date;
}

/**
 * =========================================
 * EXTRACT RESCHEDULE DATES
 * =========================================
 *
 * Handles:
 *
 * - move my appointment from Wednesday to Friday
 * - move my booking from tomorrow evening to monday
 * - reschedule my friday appointment to sunday
 * - move my appointment to tomorrow
 *
 * Returns:
 * - from_date
 * - to_date
 * =========================================
 */

export function extractRescheduleDates(rawMessage: string) {
  /**
   * =====================================
   * NORMALIZATION
   * =====================================
   */

  let normalized = normalizeDateTypos(rawMessage);

  normalized = normalizeDatePhrases(normalized);

  /**
   * =====================================
   * LOWERCASE SAFE
   * =====================================
   */

  const message = normalized.toLowerCase();

  /**
   * =====================================
   * DEFAULTS
   * =====================================
   */

  let from_date: Date | null = null;

  let to_date: Date | null = null;

  /**
   * =====================================
   * FROM SECTION
   * =====================================
   *
   * Capture:
   * - after "from"
   * - after "my"
   *
   * Before:
   * - "to"
   * =====================================
   */

  const fromSectionMatch = message.match(/\b(from|my)\b(.*?)\bto\b/i);

  /**
   * FROM SECTION FOUND
   */

  if (fromSectionMatch?.[2]) {
    const fromSection = fromSectionMatch[2].trim();

    /**
     * EXTRACT DATE PHRASE
     */

    const fromPhrase = extractDatePhrase(fromSection);

    /**
     * PARSE
     */

    from_date = parseDatePhrase(fromPhrase || "");
  }

  /**
   * =====================================
   * TO SECTION
   * =====================================
   *
   * Everything after:
   * - to
   * =====================================
   */

  const toSectionMatch = message.match(/\bto\b(.*)$/i);

  /**
   * TO SECTION FOUND
   */

  if (toSectionMatch?.[1]) {
    const toSection = toSectionMatch[1].trim();

    /**
     * EXTRACT DATE PHRASE
     */

    const toPhrase = extractDatePhrase(toSection);

    /**
     * PARSE
     */

    to_date = parseDatePhrase(toPhrase || "");
  }

  /**
   * =====================================
   * FALLBACK
   * =====================================
   *
   * Example:
   * "move my appointment to friday"
   *
   * No FROM exists.
   * =====================================
   */

  if (!to_date) {
    const generalPhrase = extractDatePhrase(message);

    to_date = parseDatePhrase(generalPhrase || "");
  }

  /**
   * =====================================
   * LOGGING
   * =====================================
   */

  console.log("RESCHEDULE DATE EXTRACTION", {
    rawMessage,

    normalized,

    from_date,

    to_date,
  });

  /**
   * =====================================
   * RETURN
   * =====================================
   */

  return {
    from_date,

    to_date,
  };
}
