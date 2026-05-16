import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { hasDuplicateBooking } from "./has-duplicate-booking";

/**
 * =========================================
 * CREATE APPOINTMENT
 * =========================================
 */

export async function createAppointment({
  patient_id,

  doctor_id,

  slot_id,

  reason,
}: {
  patient_id: string;

  doctor_id: string;

  slot_id: string;

  reason: string;
}) {
  await dbClient.init();

  const appointmentRepo = dbClient.client.getRepository(Appointment);

  const slotRepo = dbClient.client.getRepository(DoctorSlot);

  /**
   * FIND SLOT
   */

  const slot = await slotRepo.findOne({
    where: {
      id: slot_id,
    },
  });

  if (!slot) {
    return {
      success: false,

      message: "Slot not found",
    };
  }

  /**
   * SLOT BOOKED
   */

  if (slot.is_booked) {
    return {
      success: false,

      message: "Slot already booked",
    };
  }

  /**
   * DUPLICATE
   */

  const duplicate = await hasDuplicateBooking({
    patient_id,

    slot_id,
  });

  if (duplicate) {
    return {
      success: false,

      message: "You already booked this slot.",
    };
  }

  /**
   * BOOK SLOT
   */

  slot.is_booked = true;

  await slotRepo.save(slot);

  /**
   * CREATE
   */

  const appointment = appointmentRepo.create({
    patient_id,

    doctor_id,

    slot_id,

    reason,

    status: "CONFIRMED",
  });

  await appointmentRepo.save(appointment);

  /**
   * LOG
   */

  console.log("APPOINTMENT CREATED:", {
    appointment_id: appointment.id,

    patient_id,

    doctor_id,

    slot_id,
  });

  return {
    success: true,

    appointment,

    slot,
  };
}
