/**
 * =========================================
 * BOT INTENTS
 * =========================================
 */

export type ExtractedIntent =
  | "BOOK"
  | "CANCEL"
  | "VIEW"
  | "AVAILABILITY"
  | "GREETING"
  | "UNKNOWN";

/**
 * =========================================
 * DETECT INTENT
 * =========================================
 */

export function detectIntent(message: string): ExtractedIntent {
  /**
   * BOOK
   */

  if (
    (message.includes("book") ||
      message.includes("booking") ||
      message.includes("schedule") ||
      message.includes("consult") ||
      message.includes("see")) &&
    (message.includes("doctor") ||
      message.includes("dr") ||
      message.includes("me") ||
      message.includes("want") ||
      message.includes("need") ||
      message.includes("slot"))
  ) {
    return "BOOK";
  }

  /**
   * CANCEL
   */

  if (
    message.includes("cancel") &&
    (message.includes("appointment") || message.includes("booking"))
  ) {
    return "CANCEL";
  }

  /**
   * VIEW
   */

  if (
    message.includes("my appointments") ||
    message.includes("my bookings") ||
    message.includes("upcoming") ||
    message.includes("show appointments") ||
    message.includes("show bookings")
  ) {
    return "VIEW";
  }

  /**
   * AVAILABILITY
   */

  if (
    message.includes("available") ||
    message.includes("availability") ||
    message.includes("free slot") ||
    message.includes("current appointment") ||
    message.includes("recent appointment") ||
    message.includes("free time") ||
    message.includes("slots today")
  ) {
    return "AVAILABILITY";
  }

  /**
   * GREETING
   */

  if (
    [
      "hi",
      "hello",
      "hey",
      "good morning",
      "good afternoon",
      "good evening",
      "what's up",
      "how are you",
      "greetings",
      "what up",
    ].some((word) => message.includes(word))
  ) {
    return "GREETING";
  }

  return "UNKNOWN";
}
