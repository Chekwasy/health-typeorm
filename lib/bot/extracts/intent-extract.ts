/**
 * =========================================
 * BOT INTENTS
 * =========================================
 */

export type ExtractedIntent =
  | "BOOK"
  | "RESCHEDULE"
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
    ((message.includes("book") ||
      message.includes("schedule") ||
      message.includes("see")) &&
      (message.includes("doctor") || message.includes("dr"))) ||
    message.includes("book")
  ) {
    return "BOOK";
  }

  /**
   * RESCHEDULE
   */

  if (
    (message.includes("reschedule") ||
      message.includes("change") ||
      message.includes("move")) &&
    (message.includes("appointment") ||
      message.includes("booking") ||
      message.includes("schedule") ||
      message.includes("appointments") ||
      message.includes("bookings"))
  ) {
    return "RESCHEDULE";
  }

  /**
   * CANCEL
   */

  if (
    (message.includes("cancel") || message.includes("delete")) &&
    (message.includes("appointment") ||
      message.includes("booking") ||
      message.includes("schedule") ||
      message.includes("appointments") ||
      message.includes("bookings"))
  ) {
    return "CANCEL";
  }

  /**
   * VIEW
   */

  if (
    (message.includes("my") ||
      message.includes("upcoming ") ||
      message.includes("show") ||
      message.includes("view") ||
      message.includes("see")) &&
    (message.includes("booking") ||
      message.includes("bookings") ||
      message.includes("appointments") ||
      message.includes("appointment"))
  ) {
    return "VIEW";
  }

  /**
   * AVAILABILITY
   */

  if (
    ((message.includes("doctor") ||
      message.includes("doctors") ||
      message.includes("dr")) &&
      (message.includes("available") ||
        message.includes("free") ||
        message.includes("open"))) ||
    message.includes("availability") ||
    message.includes("available") ||
    message.includes("free")
  ) {
    return "AVAILABILITY";
  }

  /**
   * GREETING
   */

  if (
    message.includes("hi") ||
    message.includes("hello") ||
    message.includes("hey") ||
    message.includes("good morning") ||
    message.includes("good afternoon") ||
    message.includes("good evening") ||
    message.includes("what's up") ||
    message.includes("how are you") ||
    message.includes("greetings") ||
    message.includes("what up")
  ) {
    return "GREETING";
  }

  return "UNKNOWN";
}
