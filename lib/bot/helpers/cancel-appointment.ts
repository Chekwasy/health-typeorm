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

      message: "Your appointment could not be found please try again later.",
    };
  }

  /**
   * ALREADY CANCELLED
   */

  if (appointment.status === "CANCELLED_BY_PATIENT") {
    return {
      success: false,

      message: "Your appointment is already cancelled by you.",
    };
  }

  if (appointment.status === "CANCELLED_BY_DOCTOR") {
    return {
      success: false,

      message: "Your appointment is already cancelled by the doctor.",
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
