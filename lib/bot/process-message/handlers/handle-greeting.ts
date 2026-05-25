/**
 * =========================================
 * HANDLE GREETING
 * =========================================
 *
 * Purpose:
 * - respond to greetings
 * - introduce bot capabilities
 * - provide conversational guidance
 * =========================================
 */

import { BotConversation } from "@/entities/BotConversation";
import { resetConversationContext } from "../../helpers/reset-context";

export async function handleGreeting(
  channel: string,
  conversation: BotConversation,
) {
  /**
   * =====================================
   * RESPONSE
   * =====================================
   */

  await resetConversationContext(conversation);

  if (channel !== "VOICE") {
    return {
      success: true,

      reply: `Hello 👋

How can I help you today?

You can:
- Book appointment e.g. "Book Dr Smith tomorrow at 3pm | I need a cardiologist on 20th June"
- View appointments e.g. "Show my appointments for 18th June | today | tomorrow"
- Cancel appointment e.g. "Cancel my appointment on 20th June" | "Cancel appointment with Dr Smith tomorrow"
- Check doctor availability e.g. "What doctors are available tomorrow?" | "What slots do I have tomorrow?"

More Examples:
- Book Dr Richard tomorrow evening
- Need a skin doctor tomorrow
- Show my appointments
- Cancel my appointment`,
    };
  } else {
    return {
      success: true,
      reply: "Hello! How can I help you today?",
    };
  }
}
