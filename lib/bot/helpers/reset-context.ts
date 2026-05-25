import dbClient from "@/lib/db";

import { BotConversation } from "@/entities/BotConversation";

/**
 * =========================================
 * RESET CONVERSATION CONTEXT
 * =========================================
 *
 * Purpose:
 * - reload fresh conversation entity
 * - avoid stale object issues
 * - safely reset context
 * - save directly to DB
 * =========================================
 */

export async function resetConversationContext(conversation: BotConversation) {
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
   * FIND CONVERSATION
   * =====================================
   */

  const updatedConversation = await conversationRepo.findOne({
    where: {
      id: conversation.id,
    },
  });

  /**
   * NOT FOUND
   * =====================================
   */

  if (!updatedConversation) {
    console.warn("CONVERSATION NOT FOUND");

    return null;
  }

  /**
   * =====================================
   * RESET CONTEXT
   * =====================================
   */

  updatedConversation.context = {};

  /**
   * =====================================
   * CLEAR ACTIVE INTENT
   * =====================================
   */

  updatedConversation.current_intent = null;

  /**
   * =====================================
   * CLEAR LAST MESSAGE
   * =====================================
   */

  updatedConversation.last_message = null;

  /**
   * =====================================
   * SAVE
   * =====================================
   */

  await conversationRepo.save(updatedConversation);

  /**
   * =====================================
   * LOGGING
   * =====================================
   */

  console.log("CONVERSATION CONTEXT RESET", {
    conversation_id: updatedConversation.id,

    user_id: updatedConversation.user_id,
  });

  /**
   * =====================================
   * RETURN
   * =====================================
   */

  return updatedConversation;
}
