import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

/**
 * =========================================
 * ACTIVE BOOKING LIMIT
 * =========================================
 */

export async function hasReachedBookingLimit(patient_id: string) {
  await dbClient.init();

  const appointmentRepo = dbClient.client.getRepository(Appointment);

  const appointments = await appointmentRepo.find({
    where: {
      patient_id,
    },

    relations: ["slot"],
  });

  /**
   * ACTIVE FUTURE BOOKINGS
   */

  const active = appointments.filter((appointment) => {
    const future = new Date(appointment.slot.start_time) > new Date();

    const valid =
      appointment.status === "PENDING" || appointment.status === "CONFIRMED";

    return future && valid;
  });

  return active.length >= 4;
}
