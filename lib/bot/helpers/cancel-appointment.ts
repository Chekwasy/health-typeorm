import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

import { DoctorSlot } from "@/entities/DoctorSlot";

/**
 * =========================================
 * CANCEL APPOINTMENT
 * =========================================
 */

export async function cancelAppointment(
  appointment_id: string,
  patient_id: string,
) {
  await dbClient.init();

  const appointmentRepo = dbClient.client.getRepository(Appointment);

  const slotRepo = dbClient.client.getRepository(DoctorSlot);

  /**
   * FIND
   */

  const appointment = await appointmentRepo.findOne({
    where: {
      id: appointment_id,

      patient_id,
    },

    relations: ["slot"],
  });

  if (!appointment) {
    return {
      success: false,

      message: "Appointment not found",
    };
  }

  /**
   * ALREADY CANCELLED
   */

  if (appointment.status === "CANCELLED_BY_PATIENT") {
    return {
      success: false,

      message: "Appointment already cancelled",
    };
  }

  /**
   * CANCEL
   */

  appointment.status = "CANCELLED_BY_PATIENT";

  await appointmentRepo.save(appointment);

  /**
   * FREE SLOT
   */

  appointment.slot.is_booked = false;

  await slotRepo.save(appointment.slot);

  /**
   * LOG
   */

  console.log("APPOINTMENT CANCELLED:", {
    appointment_id: appointment.id,

    patient_id,
  });

  return {
    success: true,

    appointment,
  };
}
