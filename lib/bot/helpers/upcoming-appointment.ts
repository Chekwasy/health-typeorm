import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

/**
 * =========================================
 * UPCOMING APPOINTMENTS
 * =========================================
 */

export async function getUpcomingAppointments(patient_id: string) {
  await dbClient.init();

  const appointmentRepo = dbClient.client.getRepository(Appointment);

  const appointments = await appointmentRepo.find({
    where: {
      patient_id,
    },

    relations: ["slot"],
  });

  /**
   * FUTURE ONLY
   */

  return appointments.filter(
    (appointment) => new Date(appointment.slot.start_time) > new Date(),
  );
}
