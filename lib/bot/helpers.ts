import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

import { DoctorProfile } from "@/entities/DoctorProfile";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { Profile } from "@/entities/Profile";

/**
 * =========================================
 * FIND DOCTOR BY NAME
 * =========================================
 */

export async function findDoctorByName(doctorName: string) {
  await dbClient.init();

  const profileRepo = dbClient.client.getRepository(Profile);

  /**
   * CLEAN NAME
   */

  const cleanName = doctorName.replace(/dr\.?/i, "").trim().toLowerCase();

  /**
   * GET DOCTORS
   */

  const doctors = await profileRepo.find({
    where: {
      role: "DOCTOR",
    },
  });

  /**
   * MATCH
   */

  const matchedDoctor = doctors.find((doctor) => {
    const firstName = doctor.first_name.toLowerCase();

    const lastName = doctor.last_name.toLowerCase();

    const fullName = `${firstName} ${lastName}`;

    return (
      fullName.includes(cleanName) ||
      cleanName.includes(firstName) ||
      cleanName.includes(lastName)
    );
  });

  /**
   * LOG
   */

  console.log("DOCTOR LOOKUP:", {
    search: doctorName,

    matched: matchedDoctor?.id || null,
  });

  return matchedDoctor || null;
}

/**
 * =========================================
 * FIND DOCTOR BY SPECIALIZATION
 * =========================================
 */

export async function findDoctorBySpecialization(specialization: string) {
  await dbClient.init();

  const doctorProfileRepo = dbClient.client.getRepository(DoctorProfile);

  const profileRepo = dbClient.client.getRepository(Profile);

  /**
   * FIND MATCHING
   */

  const doctorProfiles = await doctorProfileRepo.find();

  const matchedProfile = doctorProfiles.find((profile) =>
    profile.specialty?.toLowerCase().includes(specialization.toLowerCase()),
  );

  if (!matchedProfile) {
    return null;
  }

  /**
   * GET PROFILE
   */

  const doctor = await profileRepo.findOne({
    where: {
      id: matchedProfile.id,
    },
  });

  return doctor || null;
}

/**
 * =========================================
 * VALIDATE FUTURE DATE
 * =========================================
 */

export function isPastDate(date: Date) {
  return new Date(date) < new Date();
}

/**
 * =========================================
 * FIND AVAILABLE SLOT
 * =========================================
 */

export async function findAvailableSlot({
  doctor_id,

  appointment_date,

  time_period,
}: {
  doctor_id: string;

  appointment_date: Date;

  time_period?: string | null;
}) {
  await dbClient.init();

  const slotRepo = dbClient.client.getRepository(DoctorSlot);

  /**
   * DAY RANGE
   */

  const startOfDay = new Date(appointment_date);

  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(appointment_date);

  endOfDay.setHours(23, 59, 59, 999);

  /**
   * GET SLOTS
   */

  const slots = await slotRepo.find({
    where: {
      doctor_id,

      is_booked: false,
    },
  });

  /**
   * SAME DAY
   */

  const sameDaySlots = slots.filter((slot) => {
    const start = new Date(slot.start_time);

    return start >= startOfDay && start <= endOfDay;
  });

  /**
   * TIME FILTER
   */

  let filteredSlots = sameDaySlots;

  if (time_period) {
    filteredSlots = sameDaySlots.filter((slot) => {
      const hour = new Date(slot.start_time).getHours();

      /**
       * MORNING
       */

      if (time_period === "morning" && hour >= 6 && hour < 12) {
        return true;
      }

      /**
       * AFTERNOON
       */

      if (time_period === "afternoon" && hour >= 12 && hour < 17) {
        return true;
      }

      /**
       * EVENING
       */

      if (time_period === "evening" && hour >= 17 && hour < 22) {
        return true;
      }

      /**
       * NIGHT
       */

      if (time_period === "night" && hour >= 22) {
        return true;
      }

      return false;
    });
  }

  /**
   * SORT
   */

  filteredSlots.sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  /**
   * LOG
   */

  console.log("SLOT SEARCH:", {
    doctor_id,

    requested_date: appointment_date,

    found: filteredSlots.length,
  });

  return filteredSlots[0] || null;
}

/**
 * =========================================
 * SUGGEST ALTERNATIVE SLOTS
 * =========================================
 */

export async function suggestAlternativeSlots({
  doctor_id,
}: {
  doctor_id: string;
}) {
  await dbClient.init();

  const slotRepo = dbClient.client.getRepository(DoctorSlot);

  /**
   * AVAILABLE FUTURE
   */

  const slots = await slotRepo.find({
    where: {
      doctor_id,

      is_booked: false,
    },
  });

  /**
   * FUTURE
   */

  const futureSlots = slots.filter(
    (slot) => new Date(slot.start_time) > new Date(),
  );

  /**
   * SORT
   */

  futureSlots.sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  /**
   * LIMIT
   */

  return futureSlots.slice(0, 5);
}

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
