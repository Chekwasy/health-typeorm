import dbClient from "@/lib/db";

import { BotConversation } from "@/entities/BotConversation";

/**
 * =========================================
 * RESET EXPIRED CONVERSATION
 * =========================================
 *
 * Purpose:
 * - clear old conversational memory
 * - prevent stale booking context
 * - avoid wrong carry-over data
 *
 * Example:
 *
 * Old conversation:
 * "Book Dr Richard tomorrow"
 *
 * User returns after 2 hours:
 * "Okay"
 *
 * Without expiry reset,
 * bot may wrongly continue
 * previous booking flow.
 * =========================================
 */

export async function resetExpiredConversation(conversation: BotConversation) {
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
   * NO EXPIRY SET
   * =====================================
   */

  if (!conversation.expires_at) {
    conversation.expires_at = new Date();

    conversation.expires_at.setMinutes(
      conversation.expires_at.getMinutes() + 10,
    );

    await conversationRepo.save(conversation);
    return {
      expired: false,

      conversation,
    };
  }

  /**
   * =====================================
   * CHECK EXPIRY
   * =====================================
   */

  const now = new Date();

  const expired = now > new Date(conversation.expires_at);

  /**
   * =====================================
   * NOT EXPIRED
   * =====================================
   */

  if (!expired) {
    return {
      expired: false,

      conversation,
    };
  }

  /**
   * =====================================
   * LOGGING
   * =====================================
   */

  console.log("BOT SESSION EXPIRED", {
    user_id: conversation.user_id,

    conversation_id: conversation.id,
  });

  /**
   * =====================================
   * RESET MEMORY
   * =====================================
   */

  conversation.context = { active_intent: null };

  /**
   * =====================================
   * RESET EXPIRY
   * =====================================
   *
   * New 10-minute session
   */

  const newExpiry = new Date();

  newExpiry.setMinutes(newExpiry.getMinutes() + 10);

  conversation.expires_at = newExpiry;

  /**
   * =====================================
   * SAVE CHANGES
   * =====================================
   */

  await conversationRepo.save(conversation);

  /**
   * =====================================
   * RETURN
   * =====================================
   */

  return {
    expired: true,

    conversation,
  };
}
