import dbClient from "@/lib/db";

import { BotConversation } from "@/entities/BotConversation";

/**
 * =========================================
 * LOAD CONVERSATION
 * =========================================
 *
 * Purpose:
 * - load existing conversation
 * - create one if missing
 * - initialize expiry
 *
 * Used by:
 * process-message.ts
 * =========================================
 */

export async function loadConversation({
  user_id,

  channel = "WEB",
}: {
  user_id: string;

  channel?: string;
}) {
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
   * FIND EXISTING CONVERSATION
   * =====================================
   */

  let conversation = await conversationRepo.findOne({
    where: {
      user_id,
    },
  });

  /**
   * =====================================
   * CREATE IF NONE EXISTS
   * =====================================
   */

  if (!conversation) {
    /**
     * SESSION EXPIRY
     *
     * Default:
     * 10 minutes
     */

    const expiresAt = new Date();

    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    /**
     * CREATE CONVERSATION
     */

    conversation = conversationRepo.create({
      user_id,

      channel: channel as any,

      context: {},

      expires_at: expiresAt,
    });

    /**
     * SAVE
     */

    await conversationRepo.save(conversation);

    console.log("NEW BOT CONVERSATION CREATED", {
      user_id,

      conversation_id: conversation.id,
    });
  }

  /**
   * =====================================
   * RETURN CONVERSATION
   * =====================================
   */

  return conversation;
}
