import { Appointment } from "@/entities/Appointment";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { Profile } from "@/entities/Profile";

/**
 * =========================================
 * BOOKING SUCCESS RESPONSE
 * =========================================
 *
 * Purpose:
 * - centralize booking success formatting
 * - keep handlers cleaner
 * - make future response updates easier
 * =========================================
 */

export function bookingSuccessResponse({
  doctor,

  slot,

  appointment,
}: {
  doctor: Profile;

  slot: DoctorSlot;

  appointment?: Appointment | null;
}) {
  /**
   * =====================================
   * SLOT DATE
   * =====================================
   */

  const start = new Date(slot.start_time);

  /**
   * =====================================
   * FORMAT RESPONSE
   * =====================================
   */

  return `Appointment booked successfully 🎉

Doctor:
${doctor.title || "Dr"} ${doctor.first_name} ${doctor.last_name}

Date:
${start.toLocaleDateString()}

Time:
${start.toLocaleTimeString()}

Reference:
${appointment?.id || "N/A"}`;
}
