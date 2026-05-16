/**
 * =========================================
 * HANDLE FALLBACK
 * =========================================
 *
 * Purpose:
 * - handle unsupported messages
 * - guide users back into valid flows
 * - provide conversational examples
 * - reduce dead-end interactions
 * =========================================
 */

export async function handleFallback() {
  /**
   * =====================================
   * RESPONSE
   * =====================================
   */

  return {
    success: false,

    reply: `Sorry, I did not fully understand your request.

You can ask things like:

Booking:
- Book Dr Richard tomorrow evening
- I need a skin doctor next Tuesday
- Book appointment for 5pm tomorrow

Availability:
- Any slots available today?
- Is Dr Richard available tomorrow?
- Check dentist availability Friday

Viewing:
- Show my appointments
- My upcoming bookings
- View appointments

Cancellation:
- Cancel my appointment
- Cancel Dr Richard appointment for tomorrow
- Cancel my 5pm booking`,
  };
}
