import { extractDoctorName } from "./doctor-extract";
import { extractSpecialization } from "./specialization-extract";
import { ExtractedIntent, detectIntent } from "./intent-extract";
import { extractDate } from "./date-extract";
import { TYPO_MAP } from "../typos/typos";
import { extractTimeData } from "./time-extract";
import { extractReason } from "./reason-extract";
import { extractAppointmentReference } from "./appointment-extract";
import { extractRescheduleDates } from "./reschedule-date-extract";
import { extractRescheduleTimeData } from "./reschedule-time-extract";

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

  doctor_id: string | null;

  specialization: string | null;

  appointment_date: Date | null;

  time_period: string | null;

  to_date: string | null;

  from_date: string | null;

  from_time_period: string | null;

  from_appointment_time: string | null;

  to_time_period: string | null;

  to_appointment_time: string | null;

  appointment_time: string | null;

  appointment_reference: string | null;

  reason: string | null;
}

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
 * MAIN EXTRACTION FUNCTION
 * =========================================
 */

export async function extractMessage(
  rawMessage: string,
): Promise<ExtractedData> {
  /**
   * NORMALIZE
   */

  const normalizedMessage = normalizeMessage(rawMessage);

  /**
   * DETECT
   */

  const intent = detectIntent(normalizedMessage);

  const doctor_details = await extractDoctorName(normalizedMessage);

  const doctor_name = doctor_details?.doctor_name || null;

  const doctor_id = doctor_details?.doctor_id || null;

  const specialization = extractSpecialization(normalizedMessage);

  const appointment_date = extractDate(normalizedMessage);

  const { to_date, from_date } = extractRescheduleDates(normalizedMessage);

  const {
    from_time_period,
    from_appointment_time,
    to_time_period,
    to_appointment_time,
  } = extractRescheduleTimeData(normalizedMessage);

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

    doctor_id,

    specialization,

    appointment_date,

    to_date,

    from_date,

    from_time_period,

    from_appointment_time,

    to_time_period,

    to_appointment_time,

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
