import { BotConversation } from "@/entities/BotConversation";

/**
 * =========================================
 * RESET CONVERSATION CONTEXT
 * =========================================
 *
 * Purpose:
 * - clear completed conversational flow
 * - reset intent
 * - remove stale extracted entities
 * - prepare for fresh conversation
 *
 * Use After:
 * - booking success
 * - cancellation success
 * - reschedule success
 * - greeting handled
 * - unknown intent handled
 * - completed availability flow
 * =========================================
 */

export function resetConversationContext(conversation: BotConversation) {
  /**
   * =====================================
   * CLEAR CONTEXT
   * =====================================
   */

  conversation.context = { active_intent: null };

  /**
   * =====================================
   * CLEAR ACTIVE INTENT
   * =====================================
   */

  conversation.current_intent = null;

  /**
   * =====================================
   * CLEAR LAST MESSAGE
   * =====================================
   */

  conversation.last_message = null;

  /**
   * =====================================
   * UPDATE TIME
   * =====================================
   */

  conversation.updated_at = new Date();

  /**
   * =====================================
   * LOGGING
   * =====================================
   */

  console.log("CONVERSATION CONTEXT RESET", {
    conversation_id: conversation.id,

    user_id: conversation.user_id,
  });

  /**
   * =====================================
   * RETURN UPDATED CONVERSATION
   * =====================================
   */

  return conversation;
}
