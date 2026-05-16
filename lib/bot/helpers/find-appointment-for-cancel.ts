import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

/**
 * =========================================
 * FIND APPOINTMENT FOR CANCELLATION
 * =========================================
 *
 * This allows users to cancel
 * appointments conversationally.
 *
 * Examples:
 * - Cancel Dr Richard appointment today
 * - Cancel my 5pm appointment
 * - Cancel tomorrow booking
 *
 * Instead of forcing UUID usage.
 * =========================================
 */

export async function findAppointmentForCancellation({
  patient_id,

  doctor_id,

  appointment_date,

  appointment_time,
}: {
  patient_id: string;

  doctor_id?: string | null;

  appointment_date?: Date | null;

  appointment_time?: string | null;
}) {
  await dbClient.init();

  /**
   * =====================================
   * REPOSITORIES
   * =====================================
   */

  const appointmentRepo = dbClient.client.getRepository(Appointment);

  /**
   * =====================================
   * GET ACTIVE APPOINTMENTS
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
   * ACTIVE FUTURE BOOKINGS ONLY
   * =====================================
   */

  let filtered = appointments.filter((appointment) => {
    const future = new Date(appointment.slot.start_time) > new Date();

    const active =
      appointment.status === "PENDING" || appointment.status === "CONFIRMED";

    return future && active;
  });

  /**
   * =====================================
   * FILTER BY DOCTOR
   * =====================================
   */

  if (doctor_id) {
    filtered = filtered.filter(
      (appointment) => appointment.doctor_id === doctor_id,
    );
  }

  /**
   * =====================================
   * FILTER BY DATE
   * =====================================
   */

  if (appointment_date) {
    const targetDate = new Date(appointment_date);

    filtered = filtered.filter((appointment) => {
      const slotDate = new Date(appointment.slot.start_time);

      return (
        slotDate.getFullYear() === targetDate.getFullYear() &&
        slotDate.getMonth() === targetDate.getMonth() &&
        slotDate.getDate() === targetDate.getDate()
      );
    });
  }

  /**
   * =====================================
   * FILTER BY EXACT TIME
   * =====================================
   */

  if (appointment_time) {
    filtered = filtered.filter((appointment) => {
      const slotDate = new Date(appointment.slot.start_time);

      const hour = String(slotDate.getHours()).padStart(2, "0");

      const minutes = String(slotDate.getMinutes()).padStart(2, "0");

      const slotTime = `${hour}:${minutes}`;

      return slotTime === appointment_time;
    });
  }

  /**
   * =====================================
   * SORT EARLIEST FIRST
   * =====================================
   */

  filtered.sort(
    (a, b) =>
      new Date(a.slot.start_time).getTime() -
      new Date(b.slot.start_time).getTime(),
  );

  /**
   * =====================================
   * LOGGING
   * =====================================
   */

  console.log("CANCELLATION SEARCH:", {
    patient_id,

    doctor_id,

    appointment_date,

    appointment_time,

    matches: filtered.length,
  });

  /**
   * =====================================
   * RETURN RESULTS
   * =====================================
   */

  return filtered;
}
