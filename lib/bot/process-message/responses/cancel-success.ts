import { Appointment } from "@/entities/Appointment";

import { Profile } from "@/entities/Profile";

/**
 * =========================================
 * CANCEL SUCCESS RESPONSE
 * =========================================
 *
 * Purpose:
 * - centralize cancellation response formatting
 * - keep handlers cleaner
 * - reuse response structure everywhere
 * =========================================
 */

export function cancelSuccessResponse({
  doctor,

  appointment,
}: {
  doctor: Profile | null;

  appointment: Appointment;
}) {
  /**
   * =====================================
   * SLOT DATE
   * =====================================
   */

  const start = new Date(appointment.slot.start_time);

  /**
   * =====================================
   * FORMAT RESPONSE
   * =====================================
   */

  return `Your appointment has been cancelled successfully.

Doctor:
${doctor?.title || "Dr"} ${doctor?.first_name || ""} ${doctor?.last_name || ""}

Date:
${start.toLocaleDateString()}

Time:
${start.toLocaleTimeString()}

Reference:
${appointment.id}`;
}
