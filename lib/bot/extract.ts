import * as chrono from "chrono-node";

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
 * EXTRACTED RESULT
 * =========================================
 */

export interface ExtractedData {
  intent: ExtractedIntent;

  raw_message: string;

  normalized_message: string;

  doctor_name: string | null;

  specialization: string | null;

  appointment_date: Date | null;

  time_period: string | null;

  appointment_reference: string | null;

  reason: string | null;
}

/**
 * =========================================
 * TYPO NORMALIZATION
 * =========================================
 *
 * Handles:
 * - bok -> book
 * - appointmnt -> appointment
 * - tmrw -> tomorrow
 * - drs -> dr
 * =========================================
 */

const TYPO_MAP: Record<string, string> = {
  bok: "book",

  appointmnt: "appointment",

  appointmet: "appointment",

  apointment: "appointment",

  tmrw: "tomorrow",

  tomorow: "tomorrow",

  drs: "dr",

  doc: "doctor",

  avilable: "available",

  availble: "available",

  cncel: "cancel",

  cancell: "cancel",
};

/**
 * =========================================
 * SPECIALIZATION KEYWORDS
 * =========================================
 */

const SPECIALIZATIONS = [
  {
    name: "Dermatologist",

    keywords: ["skin doctor", "dermatologist", "skin specialist", "skin"],
  },

  {
    name: "Cardiologist",

    keywords: ["heart doctor", "cardiologist", "heart specialist", "heart"],
  },

  {
    name: "Dentist",

    keywords: ["dentist", "tooth doctor", "dental", "teeth"],
  },

  {
    name: "Pediatrician",

    keywords: [
      "children doctor",
      "baby doctor",
      "pediatrician",
      "kids doctor",
      "child specialist",
    ],
  },

  {
    name: "General Physician",

    keywords: ["doctor", "general doctor", "physician", "gp"],
  },
];

/**
 * =========================================
 * NORMALIZE MESSAGE
 * =========================================
 */

function normalizeMessage(rawMessage: string) {
  let message = rawMessage.toLowerCase().trim();

  /**
   * REMOVE EXTRA SPACES
   */

  message = message.replace(/\s+/g, " ");

  /**
   * TYPO CORRECTIONS
   */

  Object.entries(TYPO_MAP).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, "gi");

    message = message.replace(regex, correct);
  });

  return message;
}

/**
 * =========================================
 * DETECT INTENT
 * =========================================
 */

function detectIntent(message: string): ExtractedIntent {
  /**
   * BOOK
   */

  if (
    (message.includes("book") ||
      message.includes("schedule") ||
      message.includes("appointment") ||
      message.includes("consult") ||
      message.includes("see")) &&
    (message.includes("doctor") ||
      message.includes("dr") ||
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
    ].some((word) => message.includes(word))
  ) {
    return "GREETING";
  }

  return "UNKNOWN";
}

/**
 * =========================================
 * EXTRACT DOCTOR NAME
 * =========================================
 *
 * Supports:
 * - Dr Richard
 * - Dr. Rajesh
 * - doctor mike
 * =========================================
 */

function extractDoctorName(message: string) {
  const patterns = [/(dr\.?\s+[a-z]+)/i, /(doctor\s+[a-z]+)/i];

  for (const pattern of patterns) {
    const match = message.match(pattern);

    if (match) {
      return match[0].replace(/doctor/i, "Dr").trim();
    }
  }

  return null;
}

/**
 * =========================================
 * EXTRACT SPECIALIZATION
 * =========================================
 */

function extractSpecialization(message: string) {
  for (const item of SPECIALIZATIONS) {
    const found = item.keywords.find((keyword) => message.includes(keyword));

    if (found) {
      return item.name;
    }
  }

  return null;
}

/**
 * =========================================
 * EXTRACT DATE
 * =========================================
 */

function extractDate(message: string) {
  const parsed = chrono.parse(message);

  if (!parsed.length) {
    return null;
  }

  return parsed[0].start.date();
}

/**
 * =========================================
 * EXTRACT TIME PERIOD
 * =========================================
 */

function extractTimePeriod(message: string) {
  if (message.includes("morning")) {
    return "morning";
  }

  if (message.includes("afternoon")) {
    return "afternoon";
  }

  if (message.includes("evening")) {
    return "evening";
  }

  if (message.includes("night")) {
    return "night";
  }

  /**
   * DIRECT TIME MATCH
   */

  if (/\b([1-9]|1[0-2])\s?(am|pm)\b/i.test(message)) {
    return "specific";
  }

  return null;
}

/**
 * =========================================
 * EXTRACT REASON
 * =========================================
 */

function extractReason(message: string) {
  if (message.includes("skin")) {
    return "Skin consultation";
  }

  if (message.includes("heart")) {
    return "Heart consultation";
  }

  if (message.includes("tooth") || message.includes("dental")) {
    return "Dental consultation";
  }

  if (message.includes("child") || message.includes("baby")) {
    return "Pediatric consultation";
  }

  return "General consultation";
}

/**
 * =========================================
 * EXTRACT APPOINTMENT REFERENCE
 * =========================================
 */

function extractAppointmentReference(message: string) {
  const match = message.match(/\b[a-z0-9]{6,}\b/i);

  if (match) {
    return match[0];
  }

  return null;
}

/**
 * =========================================
 * MAIN EXTRACTION FUNCTION
 * =========================================
 */

export function extractMessage(rawMessage: string): ExtractedData {
  /**
   * NORMALIZE
   */

  const normalizedMessage = normalizeMessage(rawMessage);

  /**
   * DETECT
   */

  const intent = detectIntent(normalizedMessage);

  const doctor_name = extractDoctorName(normalizedMessage);

  const specialization = extractSpecialization(normalizedMessage);

  const appointment_date = extractDate(normalizedMessage);

  const time_period = extractTimePeriod(normalizedMessage);

  const appointment_reference = extractAppointmentReference(normalizedMessage);

  const reason = extractReason(normalizedMessage);

  /**
   * RESULT
   */

  const result: ExtractedData = {
    intent,

    raw_message: rawMessage,

    normalized_message: normalizedMessage,

    doctor_name,

    specialization,

    appointment_date,

    time_period,

    appointment_reference,

    reason,
  };

  /**
   * LOGGING
   */

  console.log("BOT EXTRACTION:", result);

  return result;
}
