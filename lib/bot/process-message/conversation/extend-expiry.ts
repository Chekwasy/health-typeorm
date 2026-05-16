import dbClient from "@/lib/db";

import { BotConversation } from "@/entities/BotConversation";

/**
 * =========================================
 * EXTEND CONVERSATION EXPIRY
 * =========================================
 *
 * Purpose:
 * - keep active conversations alive
 * - extend session after each message
 *
 * Example:
 *
 * User sends message now
 * ->
 * expiry becomes:
 * now + 10 minutes
 *
 * Each new interaction:
 * refreshes expiry.
 * =========================================
 */

export async function extendExpiry(
  conversation: BotConversation,
  minutes = 10,
) {
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
   * CREATE NEW EXPIRY
   * =====================================
   */

  const newExpiry = new Date();

  newExpiry.setMinutes(newExpiry.getMinutes() + minutes);

  /**
   * =====================================
   * UPDATE CONVERSATION
   * =====================================
   */

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

  console.log("CONVERSATION EXPIRY EXTENDED", {
    conversation_id: conversation.id,

    expires_at: newExpiry,
  });

  /**
   * =====================================
   * RETURN UPDATED CONVERSATION
   * =====================================
   */

  return conversation;
}
