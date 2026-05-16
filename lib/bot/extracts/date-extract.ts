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
     * 16th may 2026
     * 16 th may 2026
     */

    /\b\d{1,2}\s?(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}\b/i,

    /**
     * 16 may
     * 16th may
     * 16 th may
     */

    /\b\d{1,2}\s?(st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,

    /**
     * may 16
     * may 16th
     * may 16 th
     */

    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}\s?(st|nd|rd|th)?\b/i,

    /**
     * SIMPLE DAY:
     * 5
     * 5th
     * 5 th
     * 2nd
     * 2 nd
     *
     * Prevent:
     * 4pm
     * 7am
     * 14:00
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
 *
 * Converts:
 * 5
 * 5th
 * 5 th
 * ->
 * 5 May 2026
 * =========================================
 */

function normalizeSimpleDay(phrase: string) {
  /**
   * SIMPLE DAY MATCH
   */

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

  /**
   * DAY
   */

  const day = Number(simpleDayMatch[1]);

  /**
   * MONTH
   */

  const month = now.toLocaleString("default", {
    month: "long",
  });

  /**
   * YEAR
   */

  const year = now.getFullYear();

  /**
   * BUILD FULL DATE
   */

  return `${day} ${month} ${year}`;
}

/**
 * =========================================
 * MAIN DATE EXTRACTION
 * =========================================
 */

export function extractDate(rawMessage: string) {
  /**
   * TYPO NORMALIZATION
   */

  let normalized = normalizeDateTypos(rawMessage);

  /**
   * PHRASE NORMALIZATION
   */

  normalized = normalizeDatePhrases(normalized);

  /**
   * EXTRACT DATE PHRASE
   */

  let datePhrase = extractDatePhrase(normalized);

  /**
   * NO DATE FOUND
   */

  if (!datePhrase) {
    console.log("NO DATE FOUND");

    return null;
  }

  /**
   * NORMALIZE SIMPLE DAY
   */

  datePhrase = normalizeSimpleDay(datePhrase);

  /**
   * CHRONO PARSE
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
   * REMOVE TIME
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

  /**
   * RETURN DATE
   */

  return date;
}
