import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { Appointment } from "@/entities/Appointment";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { findDoctorBySpecialization } from "../../helpers/find-doctor-by-specialization";

import { findAvailableSlot } from "../../helpers/find-available-slot";

import { suggestAlternativeSlots } from "../../helpers/suggest-alternative-slots";

import { BotConversation } from "@/entities/BotConversation";

import { resetConversationContext } from "../../helpers/reset-context";

import { In } from "typeorm";

/**
 * =========================================
 * CONVERT KEY TO DATE
 * =========================================
 */

function appointmentKeyToDate(key?: string | null) {
  if (!key) {
    return null;
  }

  const [year, month, day, hour, minute] = key.split("-").map(Number);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * =========================================
 * EXTRACT DATE FROM KEY
 * =========================================
 */

function extractDateFromKey(key?: string | null) {
  if (!key) {
    return null;
  }

  return key.split("-").slice(0, 3).join("-");
}

/**
 * =========================================
 * EXTRACT TIME FROM KEY
 * =========================================
 */

function extractTimeFromKey(key?: string | null) {
  if (!key) {
    return null;
  }

  const parts = key.split("-");

  return `${parts[3]}:${parts[4]}`;
}

/**
 * =========================================
 * GET TIME PERIOD
 * =========================================
 */

function getTimePeriod(hour: number) {
  if (hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }

  return "evening";
}

/**
 * =========================================
 * HANDLE RESCHEDULE APPOINTMENT
 * =========================================
 */

export async function handleReschedule({
  user_id,

  conversation,

  context,

  channel,
}: {
  user_id: string;

  conversation: BotConversation;

  context: Record<string, any>;

  channel: string;
}) {
  /**
   * =====================================
   * CHANNEL
   * =====================================
   */

  const isVoice = channel === "VOICE";

  /**
   * =====================================
   * DB INIT
   * =====================================
   */

  await dbClient.init();

  /**
   * =====================================
   * REPOSITORIES
   * =====================================
   */

  const appointmentRepo = dbClient.client.getRepository(Appointment);

  const profileRepo = dbClient.client.getRepository(Profile);

  const slotRepo = dbClient.client.getRepository(DoctorSlot);

  /**
   * =====================================
   * REQUIRE TARGET DATE
   * =====================================
   */

  if (!context.to_date) {
    return {
      success: false,

      reply: isVoice
        ? "What new appointment date would you like to move your appointment to?"
        : "What date would you like to reschedule the appointment to?",
    };
  }

  /**
   * =====================================
   * REQUIRE FROM DATE
   * =====================================
   */

  if (!context.from_date) {
    return {
      success: false,

      reply: isVoice
        ? "What appointment date would you like to move your appointment from?"
        : "What date would you like to reschedule the appointment from?",
    };
  }

  /**
   * =====================================
   * REQUIRE TARGET TIME
   * =====================================
   */

  if (!context.to_appointment_time && !context.to_time_period) {
    return {
      success: false,

      reply: isVoice
        ? "What new time would you prefer? You can say morning, evening or a specific time like 7 PM."
        : "What time would you like to reschedule the appointment to?",
    };
  }

  /**
   * =====================================
   * FIND DOCTOR
   * =====================================
   */

  let doctor: any = null;

  if (context.doctor_id) {
    doctor = await profileRepo.findOne({
      where: {
        id: context.doctor_id,
      },
    });
  }

  /**
   * =====================================
   * SPECIALIZATION FALLBACK
   * =====================================
   */

  if (!doctor && context.specialization) {
    doctor = await findDoctorBySpecialization(context.specialization);
  }

  /**
   * =====================================
   * FIND PATIENT APPOINTMENTS
   * =====================================
   */

  let appointments = await appointmentRepo.find({
    where: {
      patient_id: user_id,
    },
  });

  /**
   * =====================================
   * LOAD SLOT IDS
   * =====================================
   */

  const slotIds = appointments
    .map((appointment) => appointment.slot_id)
    .filter(Boolean);

  /**
   * =====================================
   * LOAD SLOTS
   * =====================================
   */

  const slots = await slotRepo.find({
    where: {
      id: In(slotIds),
    },
  });

  /**
   * =====================================
   * SLOT MAP
   * =====================================
   */

  const slotMap = new Map(slots.map((slot) => [slot.id, slot]));

  /**
   * =====================================
   * ATTACH SLOT
   * =====================================
   */

  const enrichedAppointments = appointments
    .map((appointment) => {
      const slot = slotMap.get(appointment.slot_id);

      if (!slot) {
        return null;
      }

      return {
        ...appointment,

        slot,
      };
    })
    .filter(Boolean) as (Appointment & {
    slot: DoctorSlot;
  })[];

  /**
   * =====================================
   * DEBUG
   * =====================================
   */

  console.log(
    "APPOINTMENTS WITH SLOTS",
    enrichedAppointments.map((appointment) => ({
      appointment_id: appointment.id,

      slot_id: appointment.slot_id,

      doctor_id: appointment.doctor_id,

      status: appointment.status,

      reason: appointment.reason,

      slot_start: appointment.slot?.start_time,

      slot_end: appointment.slot?.end_time,
    })),
  );

  /**
   * =====================================
   * TODAY KEY
   * =====================================
   */

  const now = new Date();

  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}`;

  /**
   * =====================================
   * FILTER ACTIVE + FUTURE
   * =====================================
   */

  let filteredAppointments = enrichedAppointments.filter((appointment) => {
    const active =
      appointment.status === "CONFIRMED" || appointment.status === "PENDING";

    const slotDate = extractDateFromKey(appointment.slot.start_time);

    const future = slotDate! >= todayKey;

    return active && future;
  });

  /**
   * =====================================
   * FILTER BY DOCTOR
   * =====================================
   */

  if (doctor?.id) {
    filteredAppointments = filteredAppointments.filter(
      (appointment) => appointment.doctor_id === doctor.id,
    );
  }

  /**
   * =====================================
   * FILTER BY FROM DATE
   * =====================================
   */

  filteredAppointments = filteredAppointments.filter((appointment) => {
    const slotDate = extractDateFromKey(appointment.slot.start_time);

    return slotDate === context.from_date;
  });

  console.log(
    "AFTER DATE FILTER",
    filteredAppointments.map((appointment) => ({
      appointment_id: appointment.id,

      slot_start: appointment.slot?.start_time,
    })),
  );

  /**
   * =====================================
   * FILTER BY TIME
   * =====================================
   */

  if (context.from_appointment_time) {
    filteredAppointments = filteredAppointments.filter((appointment) => {
      const slotTime = extractTimeFromKey(appointment.slot.start_time);

      return slotTime === context.from_appointment_time;
    });
  } else if (context.from_time_period) {
    filteredAppointments = filteredAppointments.filter((appointment) => {
      const start = appointmentKeyToDate(appointment.slot.start_time);

      const period = getTimePeriod(start!.getHours());

      return period === context.from_time_period;
    });
  }

  console.log(
    "AFTER TIME FILTER",
    filteredAppointments.map((appointment) => ({
      appointment_id: appointment.id,

      slot_start: appointment.slot?.start_time,
    })),
  );

  /**
   * =====================================
   * NO MATCH
   * =====================================
   */

  if (!filteredAppointments.length) {
    return {
      success: false,

      reply: "I could not find the appointment you want to reschedule.",
    };
  }

  /**
   * =====================================
   * MULTIPLE MATCHES
   * =====================================
   */

  if (filteredAppointments.length > 1) {
    const options = await Promise.all(
      filteredAppointments.map(async (appointment, index) => {
        const matchedDoctor = await profileRepo.findOne({
          where: {
            id: appointment.doctor_id,
          },
        });

        const start = appointmentKeyToDate(appointment.slot.start_time);

        return `${index + 1}. ${matchedDoctor?.title || "Dr"} ${
          matchedDoctor?.first_name
        } ${matchedDoctor?.last_name}

Date:
${start?.toLocaleDateString()}

Time:
${start?.toLocaleTimeString()}

Reference:
${appointment.id}`;
      }),
    );

    return {
      success: false,

      reply: `I found multiple appointments matching your request:

${options.join("\n\n")}`,
    };
  }

  /**
   * =====================================
   * TARGET APPOINTMENT
   * =====================================
   */

  const appointment = filteredAppointments[0];

  console.log("TARGET APPOINTMENT", {
    appointment_id: appointment.id,

    slot_id: appointment.slot_id,

    reason: appointment.reason,

    slot_start: appointment.slot?.start_time,
  });

  /**
   * =====================================
   * BUILD TARGET DATE
   * =====================================
   */

  const [year, month, day] = context.to_date.split("-").map(Number);

  const appointmentDate = new Date(year, month - 1, day);

  /**
   * =====================================
   * FIND TARGET SLOT
   * =====================================
   */

  const slot = await findAvailableSlot({
    doctor_id: appointment.doctor_id,

    appointment_date: appointmentDate,

    appointment_time: context.to_appointment_time,

    time_period: context.to_time_period,
  });

  console.log("FOUND TARGET SLOT", slot);

  /**
   * =====================================
   * SLOT NOT FOUND
   * =====================================
   */

  if (!slot) {
    const alternatives = await suggestAlternativeSlots({
      doctor_id: appointment.doctor_id,
    });

    if (!alternatives.length) {
      return {
        success: false,

        reply: "No available slots were found for the requested time.",
      };
    }

    const altText = alternatives
      .map((item: any) => {
        const start = appointmentKeyToDate(item.start_time);

        return `• ${start?.toLocaleDateString()} ${start?.toLocaleTimeString()}`;
      })
      .join("\n");

    return {
      success: false,

      reply: `The requested slot is unavailable.

Available alternatives:

${altText}`,
    };
  }

  /**
   * =====================================
   * VERIFY SLOT EXISTS
   * =====================================
   */

  const freshSlot = await slotRepo.findOne({
    where: {
      id: slot.slot_id,
    },
  });

  if (!freshSlot) {
    return {
      success: false,

      reply: "The selected slot no longer exists.",
    };
  }

  /**
   * =====================================
   * SLOT ALREADY BOOKED
   * =====================================
   */

  if (freshSlot.is_booked) {
    return {
      success: false,

      reply: "That slot is no longer available.",
    };
  }

  /**
   * =====================================
   * PATIENT CONFLICT CHECK
   * =====================================
   */

  const patientConflict = enrichedAppointments.find((item) => {
    if (item.status !== "CONFIRMED" && item.status !== "PENDING") {
      return false;
    }

    return (
      item.slot.start_time === freshSlot.start_time &&
      item.id !== appointment.id
    );
  });

  if (patientConflict) {
    return {
      success: false,

      reply: "You already have another appointment at that time.",
    };
  }

  /**
   * =====================================
   * STORE OLD VALUES
   * =====================================
   */

  const oldSlotId = appointment.slot_id;

  const oldStatus = appointment.status;

  /**
   * =====================================
   * CANCEL OLD APPOINTMENT
   * =====================================
   */

  const cancelledAppointment = await appointmentRepo.update(
    {
      id: appointment.id,

      patient_id: user_id,
    },
    {
      status: "CANCELLED_BY_PATIENT",
    },
  );

  console.log("CANCEL RESULT", {
    affected: cancelledAppointment.affected,
  });

  if (!cancelledAppointment.affected) {
    return {
      success: false,

      reply: "Failed to cancel previous appointment.",
    };
  }

  /**
   * =====================================
   * RELEASE OLD SLOT
   * =====================================
   */

  const releasedSlot = await slotRepo.update(
    {
      id: oldSlotId,
    },
    {
      is_booked: false,
    },
  );

  console.log("RELEASE SLOT RESULT", {
    oldSlotId,

    affected: releasedSlot.affected,
  });

  if (!releasedSlot.affected) {
    /**
     * RESTORE APPOINTMENT
     */

    await appointmentRepo.update(
      {
        id: appointment.id,
      },
      {
        status: oldStatus,
      },
    );

    return {
      success: false,

      reply: "Failed to release previous slot.",
    };
  }

  /**
   * =====================================
   * BOOK NEW SLOT
   * =====================================
   */

  const bookedSlot = await slotRepo.update(
    {
      id: freshSlot.id,

      is_booked: false,
    },
    {
      is_booked: true,
    },
  );

  console.log("BOOK SLOT RESULT", {
    slot_id: freshSlot.id,

    affected: bookedSlot.affected,
  });

  /**
   * =====================================
   * FAILED BOOKING
   * =====================================
   */

  if (!bookedSlot.affected) {
    /**
     * ROLLBACK
     */

    await slotRepo.update(
      {
        id: oldSlotId,
      },
      {
        is_booked: true,
      },
    );

    await appointmentRepo.update(
      {
        id: appointment.id,
      },
      {
        status: oldStatus,
      },
    );

    return {
      success: false,

      reply: "That slot is no longer available.",
    };
  }

  /**
   * =====================================
   * CREATE NEW APPOINTMENT
   * =====================================
   */

  const newAppointment = appointmentRepo.create({
    patient_id: appointment.patient_id,

    doctor_id: appointment.doctor_id,

    slot_id: freshSlot.id,

    reason: appointment.reason || context.reason || "General consultation",

    status: "CONFIRMED",
  });

  /**
   * =====================================
   * SAVE NEW APPOINTMENT
   * =====================================
   */

  let savedAppointment: Appointment | null = null;

  try {
    savedAppointment = await appointmentRepo.save(newAppointment);

    console.log("NEW APPOINTMENT CREATED", {
      appointment_id: savedAppointment?.id,

      slot_id: savedAppointment?.slot_id,

      reason: savedAppointment?.reason,
    });
  } catch (err) {
    /**
     * ROLLBACK NEW SLOT
     */

    await slotRepo.update(
      {
        id: freshSlot.id,
      },
      {
        is_booked: false,
      },
    );

    /**
     * RESTORE OLD SLOT
     */

    await slotRepo.update(
      {
        id: oldSlotId,
      },
      {
        is_booked: true,
      },
    );

    /**
     * RESTORE OLD APPOINTMENT
     */

    await appointmentRepo.update(
      {
        id: appointment.id,
      },
      {
        status: oldStatus,
      },
    );

    console.error("FAILED TO CREATE APPOINTMENT", err);

    return {
      success: false,

      reply: "Failed to create rescheduled appointment.",
    };
  }

  /**
   * =====================================
   * LOAD DOCTOR
   * =====================================
   */

  const matchedDoctor = await profileRepo.findOne({
    where: {
      id: appointment.doctor_id,
    },
  });

  /**
   * =====================================
   * RESET CONTEXT
   * =====================================
   */

  await resetConversationContext(conversation);

  /**
   * =====================================
   * SUCCESS LOGGING
   * =====================================
   */

  console.log("RESCHEDULE SUCCESS", {
    cancelled_appointment_id: appointment.id,

    released_old_slot: oldSlotId,

    booked_new_slot: freshSlot.id,

    new_appointment_id: savedAppointment?.id,
  });

  /**
   * =====================================
   * FRONTEND DATE
   * =====================================
   */

  const start = appointmentKeyToDate(freshSlot.start_time);

  /**
   * =====================================
   * RESPONSE
   * =====================================
   */

  return {
    success: true,

    reply: `Appointment rescheduled successfully 🎉

Previous appointment cancelled:
✅ Success

Previous slot released:
✅ Success

New slot booked:
✅ Success

New appointment created:
✅ Success

Doctor:
${matchedDoctor?.title || "Dr"} ${
      matchedDoctor?.first_name
    } ${matchedDoctor?.last_name}

New Date:
${start?.toLocaleDateString()}

New Time:
${start?.toLocaleTimeString()}

New Reference:
${savedAppointment?.id}`,
  };
}
