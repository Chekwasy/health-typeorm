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

  appointment_time: string | null;

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
  /**
   * COMMON WORDS
   * THAT ARE NOT NAMES
   */

  const invalidWords = [
    "for",
    "tomorrow",
    "today",
    "appointment",
    "booking",
    "available",
    "slot",
    "morning",
    "evening",
    "afternoon",
  ];

  /**
   * PATTERNS
   */

  const patterns = [/dr\.?\s+([a-z]+)/i, /doctor\s+([a-z]+)/i];

  for (const pattern of patterns) {
    const match = message.match(pattern);

    if (match) {
      /**
       * EXTRACT NAME ONLY
       */

      const possibleName = match[1]?.trim().toLowerCase();

      /**
       * INVALID WORD
       */

      if (invalidWords.includes(possibleName)) {
        return null;
      }

      /**
       * RETURN CLEAN
       */

      return `Dr ${match[1]}`;
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

function extractDate(rawMessage: string) {
  /**
   * NORMALIZE MESSAGE
   */

  let message = rawMessage.toLowerCase();

  /**
   * HANDLE NON-STANDARD PHRASES
   */

  message = message.replace(/next tomorrow/gi, "day after tomorrow");

  /**
   * "next 3 days"
   * -> "in 3 days"
   */

  message = message.replace(/next (\d+) days?/gi, "in $1 days");

  /**
   * CREATE NIGERIA TIMEZONE
   * REFERENCE DATE
   */

  const referenceDate = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Africa/Lagos",
    }),
  );

  /**
   * PARSE DATE
   */

  const parsed = chrono.parse(message, referenceDate);

  /**
   * NO DATE FOUND
   */

  if (!parsed.length) {
    return null;
  }

  /**
   * EXTRACT DATE
   */

  const date = parsed[0].start.date();

  /**
   * LOGGING
   */

  console.log("DATE EXTRACTION:", {
    rawMessage,

    normalized: message,

    parsed_date: date,
  });

  return date;
}

/**
 * =========================================
 * EXTRACT TIME PERIOD
 * =========================================
 */

function extractTimeData(message: string) {
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

  return {
    time_period,

    appointment_time,
  };
}

/**
 * =========================================
 * EXTRACT APPOINTMENT REASON
 * =========================================
 *
 * Attempts to infer the reason
 * for the consultation from
 * conversational language.
 *
 * Used for:
 * - booking metadata
 * - doctor context
 * - future AI improvements
 * - analytics/reporting
 * =========================================
 */

function extractReason(message: string) {
  /**
   * NORMALIZE
   */

  const text = message.toLowerCase();

  /**
   * =====================================
   * SKIN / DERMATOLOGY
   * =====================================
   */

  if (
    [
      "skin",
      "rash",
      "eczema",
      "acne",
      "pimple",
      "allergy",
      "itching",
      "dermatology",
      "fungal",
      "infection",
    ].some((word) => text.includes(word))
  ) {
    return "Skin consultation";
  }

  /**
   * =====================================
   * HEART / CARDIOLOGY
   * =====================================
   */

  if (
    [
      "heart",
      "chest pain",
      "heartbeat",
      "high blood pressure",
      "bp",
      "cardiology",
      "palpitations",
      "hypertension",
    ].some((word) => text.includes(word))
  ) {
    return "Heart consultation";
  }

  /**
   * =====================================
   * DENTAL
   * =====================================
   */

  if (
    [
      "tooth",
      "teeth",
      "gum",
      "dental",
      "dentist",
      "toothache",
      "mouth pain",
      "cavity",
    ].some((word) => text.includes(word))
  ) {
    return "Dental consultation";
  }

  /**
   * =====================================
   * PEDIATRIC
   * =====================================
   */

  if (
    ["child", "children", "baby", "kid", "infant", "pediatric", "newborn"].some(
      (word) => text.includes(word),
    )
  ) {
    return "Pediatric consultation";
  }

  /**
   * =====================================
   * FEVER / GENERAL ILLNESS
   * =====================================
   */

  if (
    [
      "fever",
      "malaria",
      "body pain",
      "weakness",
      "tired",
      "fatigue",
      "headache",
      "illness",
      "sick",
      "infection",
    ].some((word) => text.includes(word))
  ) {
    return "General medical consultation";
  }

  /**
   * =====================================
   * STOMACH / DIGESTIVE
   * =====================================
   */

  if (
    [
      "stomach",
      "ulcer",
      "vomiting",
      "diarrhea",
      "constipation",
      "abdominal pain",
      "digestion",
      "food poisoning",
    ].some((word) => text.includes(word))
  ) {
    return "Digestive consultation";
  }

  /**
   * =====================================
   * EYE
   * =====================================
   */

  if (
    [
      "eye",
      "eyes",
      "vision",
      "blurred vision",
      "eye pain",
      "sight",
      "ophthalmology",
    ].some((word) => text.includes(word))
  ) {
    return "Eye consultation";
  }

  /**
   * =====================================
   * ENT
   * =====================================
   */

  if (
    [
      "ear",
      "nose",
      "throat",
      "tonsil",
      "sinus",
      "hearing",
      "voice",
      "ent",
    ].some((word) => text.includes(word))
  ) {
    return "ENT consultation";
  }

  /**
   * =====================================
   * ORTHOPEDIC
   * =====================================
   */

  if (
    [
      "leg pain",
      "arm pain",
      "joint pain",
      "bone",
      "fracture",
      "waist pain",
      "back pain",
      "orthopedic",
      "muscle pain",
    ].some((word) => text.includes(word))
  ) {
    return "Orthopedic consultation";
  }

  /**
   * =====================================
   * WOMEN HEALTH
   * =====================================
   */

  if (
    [
      "pregnancy",
      "menstrual",
      "period pain",
      "fertility",
      "gynecology",
      "woman",
      "women health",
    ].some((word) => text.includes(word))
  ) {
    return "Gynecology consultation";
  }

  /**
   * =====================================
   * MENTAL HEALTH
   * =====================================
   */

  if (
    [
      "depression",
      "stress",
      "anxiety",
      "mental health",
      "panic",
      "therapy",
      "psychiatric",
    ].some((word) => text.includes(word))
  ) {
    return "Mental health consultation";
  }

  /**
   * =====================================
   * DEFAULT
   * =====================================
   */

  return "General consultation";
}

/**
 * =========================================
 * EXTRACT APPOINTMENT REFERENCE
 * =========================================
 */

function extractAppointmentReference(message: string) {
  /**
   * UUID MATCH
   */

  const uuidMatch = message.match(
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  );

  if (uuidMatch) {
    return uuidMatch[0];
  }

  /**
   * FALLBACK SIMPLE REFERENCE
   */

  const simpleMatch = message.match(/\b[a-z0-9]{6,}\b/i);

  if (simpleMatch) {
    return simpleMatch[0];
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

  const { time_period = null, appointment_time = null } =
    extractTimeData(normalizedMessage);

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

    appointment_time,

    appointment_reference,

    reason,
  };

  /**
   * LOGGING
   */

  console.log("BOT EXTRACTION:", result);

  return result;
}
