import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

/**
 * =========================================
 * CHECK DUPLICATE BOOKING
 * =========================================
 */

export async function hasDuplicateBooking({
  patient_id,

  slot_id,
}: {
  patient_id: string;

  slot_id: string;
}) {
  await dbClient.init();

  const appointmentRepo = dbClient.client.getRepository(Appointment);

  const existing = await appointmentRepo.findOne({
    where: {
      patient_id,

      slot_id,
    },
  });

  return !!existing;
}
