import dbClient from "@/lib/db";

import { BotConversation } from "@/entities/BotConversation";

/**
 * =========================================
 * MERGE CONTEXT
 * =========================================
 *
 * Purpose:
 * - preserve conversational memory
 * - merge newly extracted data
 * - avoid overwriting good data
 *   with null/empty values
 *
 * Example:
 *
 * User:
 * "Book Dr Richard"
 *
 * Later:
 * "Tomorrow evening"
 *
 * Memory becomes:
 * {
 *   doctor_name: "Dr Richard",
 *   appointment_date: ...,
 *   time_period: "evening"
 * }
 * =========================================
 */

export async function mergeContext({
  conversation,

  extracted,
}: {
  conversation: BotConversation;

  extracted: Record<string, any>;
}): Promise<{
  currentConversation: BotConversation;

  context: Record<string, any>;
}> {
  /**
   * =====================================
   * ENSURE DB CONNECTION
   * =====================================
   */

  await dbClient.init();

  /**
   * =====================================
   * REPOSITORY
   * =====================================
   */

  const conversationRepo = dbClient.client.getRepository(BotConversation);

  /**
   * =====================================
   * EXISTING MEMORY
   * =====================================
   */

  const currentContext: Record<string, any> = conversation.context || {};

  /**
   * =====================================
   * TOPIC SWITCHING
   * =====================================
   *
   * If user changes intent,
   * update active intent.
   * =====================================
   */

  if (extracted.intent && extracted.intent !== "UNKNOWN") {
    currentContext.intent = extracted.intent;
  }

  /**
   * =====================================
   * MERGE CONTEXT
   * =====================================
   *
   * Only overwrite values
   * when new value exists.
   * =====================================
   */

  const updatedContext = {
    ...currentContext,

    /**
     * DOCTOR
     */

    doctor_name: extracted.doctor_name || currentContext.doctor_name,

    doctor_id: extracted.doctor_id || currentContext.doctor_id,

    /**
     * SPECIALIZATION
     */

    specialization: extracted.specialization || currentContext.specialization,

    /**
     * DATE
     */

    appointment_date:
      extracted.appointment_date || currentContext.appointment_date,

    /**
     * RESCHEDULE DATES
     */

    to_date: extracted.to_date || currentContext.to_date,

    from_date: extracted.from_date || currentContext.from_date,

    /**
     * TIME PERIOD
     */

    time_period: extracted.time_period || currentContext.time_period,

    /**
     * EXACT TIME
     */

    appointment_time:
      extracted.appointment_time || currentContext.appointment_time,

    /**
     * RESCHEDULE TIME
     */

    from_time_period:
      extracted.from_time_period || currentContext.from_time_period,

    from_appointment_time:
      extracted.from_appointment_time || currentContext.from_appointment_time,

    to_time_period: extracted.to_time_period || currentContext.to_time_period,

    to_appointment_time:
      extracted.to_appointment_time || currentContext.to_appointment_time,

    /**
     * REFERENCE
     */

    appointment_reference:
      extracted.appointment_reference || currentContext.appointment_reference,

    /**
     * REASON
     */

    reason: extracted.reason || currentContext.reason,

    /**
     * ACTIVE INTENT
     */

    intent:
      extracted.intent !== "UNKNOWN" ? extracted.intent : currentContext.intent,
  };

  /**
   * =====================================
   * UPDATE EXPIRY
   * =====================================
   *
   * Extend session by
   * another 10 minutes.
   * =====================================
   */

  const newExpiry = new Date();

  newExpiry.setMinutes(newExpiry.getMinutes() + 10);

  /**
   * =====================================
   * SAVE TO CONVERSATION
   * =====================================
   */

  conversation.context = updatedContext;

  conversation.expires_at = newExpiry;

  /**
   * SAVE
   */

  await conversationRepo.save(conversation);

  /**
   * =====================================
   * LOGGING
   * =====================================
   */

  console.log("CONTEXT MERGED", {
    conversation_id: conversation.id,

    context: updatedContext,
  });

  /**
   * =====================================
   * RETURN UPDATED CONTEXT
   * =====================================
   */

  return { currentConversation: conversation, context: updatedContext };
}
