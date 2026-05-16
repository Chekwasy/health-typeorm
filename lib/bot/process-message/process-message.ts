import { extractMessage } from "./../extracts/extract";

import { loadConversation } from "./conversation/load-conversation";

import { resetExpiredConversation } from "./conversation/reset-expired-conversation";

import { mergeContext } from "./conversation/merge-context";

import { extendExpiry } from "./conversation/extend-expiry";

import { getActiveIntent } from "./utils/get-active-intent";

import { handleGreeting } from "./handlers/handle-greeting";

import { handleView } from "./handlers/handle-view";

import { handleCancel } from "./handlers/handle-cancel";

import { handleAvailability } from "./handlers/handle-availability";

import { handleBook } from "./handlers/handle-books";

import { handleFallback } from "./handlers/handle-fallback";

/**
 * =========================================
 * PROCESS BOT MESSAGE
 * =========================================
 *
 * Main bot orchestration layer.
 *
 * Responsibilities:
 * - load conversation
 * - reset expired sessions
 * - extract NLP data
 * - merge memory/context
 * - determine active intent
 * - route request to handler
 * =========================================
 */

export async function processMessage({
  user_id,

  message,

  channel = "WEB",
}: {
  user_id: string;

  message: string;

  channel?: string;
}) {
  /**
   * =====================================
   * LOAD CONVERSATION
   * =====================================
   */

  const conversation = await loadConversation({
    user_id,

    channel,
  });

  /**
   * =====================================
   * RESET EXPIRED SESSION
   * =====================================
   */

  await resetExpiredConversation(conversation);

  /**
   * =====================================
   * EXTRACT USER MESSAGE
   * =====================================
   *
   * NLP extraction:
   * - intent
   * - doctor
   * - date
   * - time
   * - specialization
   * etc
   * =====================================
   */

  const extracted = await extractMessage(message);

  /**
   * =====================================
   * LOG EXTRACTION
   * =====================================
   */

  console.log("BOT EXTRACTION:", extracted);

  /**
   * =====================================
   * MERGE CONTEXT
   * =====================================
   *
   * Preserves conversational memory.
   * =====================================
   */

  const context = await mergeContext({
    conversation,

    extracted,
  });

  /**
   * =====================================
   * EXTEND SESSION EXPIRY
   * =====================================
   */

  await extendExpiry(conversation);

  /**
   * =====================================
   * DETERMINE ACTIVE INTENT
   * =====================================
   */

  const activeIntent = getActiveIntent({
    extractedIntent: extracted.intent,

    context,
  });

  /**
   * =====================================
   * LOG ACTIVE INTENT
   * =====================================
   */

  console.log("ACTIVE INTENT:", activeIntent);

  /**
   * =====================================
   * GREETING FLOW
   * =====================================
   */

  if (activeIntent === "GREETING") {
    return await handleGreeting();
  }

  /**
   * =====================================
   * VIEW APPOINTMENTS FLOW
   * =====================================
   */

  if (activeIntent === "VIEW") {
    return await handleView({
      user_id,
    });
  }

  /**
   * =====================================
   * CANCEL APPOINTMENT FLOW
   * =====================================
   */

  if (activeIntent === "CANCEL") {
    return await handleCancel({
      user_id,

      context,
    });
  }

  /**
   * =====================================
   * AVAILABILITY FLOW
   * =====================================
   */

  if (activeIntent === "AVAILABILITY") {
    return await handleAvailability({
      context,
    });
  }

  /**
   * =====================================
   * BOOK APPOINTMENT FLOW
   * =====================================
   */

  if (activeIntent === "BOOK") {
    return await handleBook({
      user_id,

      conversation,

      context,
    });
  }

  /**
   * =====================================
   * FALLBACK FLOW
   * =====================================
   */

  return await handleFallback();
}
