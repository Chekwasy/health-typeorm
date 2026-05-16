import * as chrono from "chrono-node";

/**
 * =========================================
 * DATE NORMALIZATION + EXTRACTION
 * =========================================
 *
 * Goal:
 * - typo resistant
 * - conversational friendly
 * - stable chrono parsing
 * - date-only extraction
 *
 * Time extraction is handled separately.
 * =========================================
 */

/**
 * =========================================
 * NORMALIZE TYPO WORDS
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

    toomorow: "tomorrow",

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

  /**
   * APPLY REPLACEMENTS
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

  text = text.replace(/next tomorrow/gi, "day after tomorrow");

  /**
   * NEXT X DAYS
   *
   * next 3 days
   * -> in 3 days
   */

  text = text.replace(/next (\d+) days?/gi, "in $1 days");

  /**
   * DAY AFTER TOMORROW
   */

  text = text.replace(/a day after tomorrow/gi, "day after tomorrow");

  /**
   * REMOVE EXTRA WORDS
   */

  text = text.replace(/\bfor\b/gi, "");

  return text.trim();
}

/**
 * =========================================
 * EXTRACT DATE PHRASE ONLY
 * =========================================
 *
 * Extract only likely date text
 * instead of entire sentence.
 * =========================================
 */

function extractDatePhrase(message: string) {
  /**
   * DATE PATTERNS
   */

  const patterns = [
    /**
     * today
     * tomorrow
     */

    /\b(today|tomorrow|day after tomorrow)\b/i,

    /**
     * in 3 days
     */

    /\bin \d+ days?\b/i,

    /**
     * next week monday
     */

    /\bnext week (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,

    /**
     * next monday
     */

    /\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,

    /**
     * monday
     */

    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,

    /**
     * 16th may 2026
     */

    /\b\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i,

    /**
     * 16th may
     */

    /\b\d{1,2}(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,

    /**
     * may 16
     */

    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?\b/i,

    /**
     * 16th
     */

    /\b\d{1,2}(st|nd|rd|th)\b/i,
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
 * MAIN DATE EXTRACTION
 * =========================================
 */

export function extractDate(rawMessage: string) {
  /**
   * =====================================
   * STEP 1:
   * TYPO NORMALIZATION
   * =====================================
   */

  let normalized = normalizeDateTypos(rawMessage);

  /**
   * =====================================
   * STEP 2:
   * PHRASE NORMALIZATION
   * =====================================
   */

  normalized = normalizeDatePhrases(normalized);

  /**
   * =====================================
   * STEP 3:
   * EXTRACT DATE PHRASE
   * =====================================
   */

  const datePhrase = extractDatePhrase(normalized);

  /**
   * NO DATE FOUND
   */

  if (!datePhrase) {
    console.log("NO DATE PHRASE FOUND");

    return null;
  }

  /**
   * =====================================
   * STEP 4:
   * CHRONO PARSE
   * =====================================
   */

  const parsed = chrono.parse(datePhrase, new Date());

  /**
   * FAILED PARSE
   */

  if (!parsed.length) {
    console.log("CHRONO FAILED:", datePhrase);

    return null;
  }

  /**
   * EXTRACT DATE
   */

  const date = parsed[0].start.date();

  /**
   * =====================================
   * REMOVE TIME
   * =====================================
   *
   * Since time is extracted
   * separately.
   * =====================================
   */

  date.setHours(0, 0, 0, 0);

  /**
   * LOGGING
   */

  console.log("DATE EXTRACTION:", {
    rawMessage,

    normalized,

    datePhrase,

    parsed_date: date,
  });

  return date;
}
