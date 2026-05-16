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

export async function handleGreeting() {
  /**
   * =====================================
   * RESPONSE
   * =====================================
   */

  return {
    success: true,

    reply: `Hello 👋

How can I help you today?

You can:
- Book appointment
- View appointments
- Cancel appointment
- Check doctor availability

Examples:
- Book Dr Richard tomorrow evening
- Need a skin doctor tomorrow
- Show my appointments
- Cancel my appointment`,
  };
}
