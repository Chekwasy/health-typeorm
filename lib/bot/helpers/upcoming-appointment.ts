import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

/**
 * =========================================
 * UPCOMING APPOINTMENTS
 * =========================================
 *
 * Returns only:
 * - future appointments
 * - active appointments
 *
 * Excludes:
 * - cancelled
 * - rejected
 * - failed
 * =========================================
 */

export async function getUpcomingAppointments(patient_id: string) {
  /**
   * =====================================
   * ENSURE DB CONNECTION
   * =====================================
   */

  await dbClient.init();

  /**
   * =====================================
   * APPOINTMENT REPOSITORY
   * =====================================
   */

  const appointmentRepo = dbClient.client.getRepository(Appointment);

  /**
   * =====================================
   * LOAD APPOINTMENTS
   * =====================================
   */

  const appointments = await appointmentRepo.find({
    where: {
      patient_id,
    },

    relations: ["slot"],
  });

  /**
   * =====================================
   * VALID ACTIVE STATUSES
   * =====================================
   */

  const activeStatuses = ["PENDING", "CONFIRMED"];

  /**
   * =====================================
   * FILTER FUTURE + ACTIVE
   * =====================================
   */

  const upcoming = appointments.filter((appointment) => {
    /**
     * FUTURE SLOT
     */

    const isFuture = new Date(appointment.slot.start_time) > new Date();

    /**
     * ACTIVE STATUS
     */

    const isActive = activeStatuses.includes(appointment.status);

    return isFuture && isActive;
  });

  /**
   * =====================================
   * SORT EARLIEST FIRST
   * =====================================
   */

  upcoming.sort(
    (a, b) =>
      new Date(a.slot.start_time).getTime() -
      new Date(b.slot.start_time).getTime(),
  );

  /**
   * =====================================
   * LOGGING
   * =====================================
   */

  console.log("UPCOMING APPOINTMENTS:", {
    patient_id,

    count: upcoming.length,
  });

  /**
   * =====================================
   * RETURN RESULT
   * =====================================
   */

  return upcoming;
}
