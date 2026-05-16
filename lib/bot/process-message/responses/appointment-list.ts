import { Appointment } from "@/entities/Appointment";

import { Profile } from "@/entities/Profile";

/**
 * =========================================
 * APPOINTMENT LIST RESPONSE
 * =========================================
 *
 * Purpose:
 * - format appointment lists
 * - centralize response formatting
 * - keep handlers clean
 * =========================================
 */

export function appointmentListResponse({
  appointments,
}: {
  appointments: Array<{
    appointment: Appointment;

    doctor: Profile | null;
  }>;
}) {
  /**
   * =====================================
   * EMPTY STATE
   * =====================================
   */

  if (!appointments.length) {
    return "You currently have no upcoming appointments.";
  }

  /**
   * =====================================
   * BUILD RESPONSE
   * =====================================
   */

  const lines = appointments.map((item, index) => {
    const {
      appointment,

      doctor,
    } = item;

    /**
     * SLOT DATE
     */

    const start = new Date(appointment.slot.start_time);

    /**
     * FORMAT ITEM
     */

    return `${index + 1}. ${doctor?.title || "Dr"} ${
      doctor?.first_name || ""
    } ${doctor?.last_name || ""}

Date:
${start.toLocaleDateString()}

Time:
${start.toLocaleTimeString()}

Status:
${appointment.status}

Reference:
${appointment.id}`;
  });

  /**
   * =====================================
   * FINAL RESPONSE
   * =====================================
   */

  return `Your upcoming appointments:

${lines.join("\n\n")}`;
}
