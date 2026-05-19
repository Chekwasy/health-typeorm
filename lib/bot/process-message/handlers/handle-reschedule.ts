import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { Appointment } from "@/entities/Appointment";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { findDoctorBySpecialization } from "../../helpers/find-doctor-by-specialization";

import { findAvailableSlot } from "../../helpers/find-available-slot";

import { suggestAlternativeSlots } from "../../helpers/suggest-alternative-slots";

/**
 * =========================================
 * HANDLE RESCHEDULE APPOINTMENT
 * =========================================
 *
 * Supports:
 * - move my appointment to friday morning
 * - move my appointment from wednesday to friday
 * - reschedule 7pm appointment to 9pm
 * - move dermatologist appointment to tomorrow evening
 *
 * Context Supported:
 * - appointment_reference
 * - doctor_id
 * - doctor_name
 * - specialization
 * - from_date
 * - to_date
 * - from_appointment_time
 * - to_appointment_time
 * - from_time_period
 * - to_time_period
 * =========================================
 */

export async function handleReschedule({
  user_id,

  context,

  channel,
}: {
  user_id: string;

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

  /**
   * DIRECT ID
   */

  if (context.doctor_id) {
    doctor = await profileRepo.findOne({
      where: {
        id: context.doctor_id,
      },
    });
  }

  /**
   * SPECIALIZATION
   */

  if (!doctor && context.specialization) {
    doctor = await findDoctorBySpecialization(context.specialization);
  }

  /**
   * =====================================
   * FIND ACTIVE APPOINTMENTS
   * =====================================
   */

  let appointments = await appointmentRepo.find({
    where: {
      patient_id: user_id,
    },

    relations: ["slot"],
  });

  /**
   * =====================================
   * ACTIVE ONLY
   * =====================================
   */

  appointments = appointments.filter((appointment) => {
    const activeStatuses = ["CONFIRMED", "PENDING"];

    return (
      activeStatuses.includes(appointment.status) &&
      new Date(appointment.slot.start_time) > new Date()
    );
  });

  /**
   * =====================================
   * FILTER BY DOCTOR
   * =====================================
   */

  if (doctor?.id) {
    appointments = appointments.filter(
      (appointment) => appointment.doctor_id === doctor.id,
    );
  }

  /**
   * =====================================
   * FILTER BY FROM DATE
   * =====================================
   */

  if (context.from_date) {
    const startOfDay = new Date(context.from_date);

    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(context.from_date);

    endOfDay.setHours(23, 59, 59, 999);

    appointments = appointments.filter((appointment) => {
      const start = new Date(appointment.slot.start_time);

      return start >= startOfDay && start <= endOfDay;
    });
  }

  /**
   * =====================================
   * FILTER BY FROM TIME
   * =====================================
   */

  if (context.from_appointment_time) {
    appointments = appointments.filter((appointment) => {
      const start = new Date(appointment.slot.start_time);

      const time = `${String(start.getHours()).padStart(2, "0")}:${String(
        start.getMinutes(),
      ).padStart(2, "0")}`;

      return time === context.from_appointment_time;
    });
  }

  /**
   * =====================================
   * FILTER BY FROM PERIOD
   * =====================================
   */

  if (context.from_time_period && !context.from_appointment_time) {
    appointments = appointments.filter((appointment) => {
      const hour = new Date(appointment.slot.start_time).getHours();

      if (context.from_time_period === "morning" && hour >= 6 && hour < 12) {
        return true;
      }

      if (context.from_time_period === "afternoon" && hour >= 12 && hour < 17) {
        return true;
      }

      if (context.from_time_period === "evening" && hour >= 17 && hour < 22) {
        return true;
      }

      if (context.from_time_period === "night" && (hour >= 22 || hour < 6)) {
        return true;
      }

      return false;
    });
  }

  /**
   * =====================================
   * NO MATCH FOUND
   * =====================================
   */

  if (!appointments.length) {
    return {
      success: false,

      reply: isVoice
        ? "I could not find the appointment you want to reschedule. Please mention the current appointment date and time."
        : "I could not find the appointment you want to reschedule.",
    };
  }

  /**
   * =====================================
   * MULTIPLE MATCHES
   * =====================================
   */

  if (appointments.length > 1) {
    const options = await Promise.all(
      appointments.map(async (appointment, index) => {
        const matchedDoctor = await profileRepo.findOne({
          where: {
            id: appointment.doctor_id,
          },
        });

        const start = new Date(appointment.slot.start_time);

        if (isVoice) {
          return `Appointment ${index + 1} with ${
            matchedDoctor?.title || "Dr"
          } ${matchedDoctor?.first_name} ${
            matchedDoctor?.last_name
          } on ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}`;
        }

        return `${index + 1}. ${matchedDoctor?.title || "Dr"} ${
          matchedDoctor?.first_name
        } ${matchedDoctor?.last_name}

Date:
${start.toLocaleDateString()}

Time:
${start.toLocaleTimeString()}

Reference:
${appointment.id}`;
      }),
    );

    return {
      success: false,

      reply: isVoice
        ? `I found multiple appointments. ${options.join(
            ". ",
          )}. Please mention the current appointment date and time you want to move.`
        : `I found multiple appointments matching your request:

${options.join("\n\n")}`,
    };
  }

  /**
   * =====================================
   * TARGET APPOINTMENT
   * =====================================
   */

  const appointment = appointments[0];

  /**
   * =====================================
   * FIND TARGET SLOT
   * =====================================
   */

  const slot = await findAvailableSlot({
    doctor_id: appointment.doctor_id,

    appointment_date: new Date(context.to_date),

    appointment_time: context.to_appointment_time,

    time_period: context.to_time_period,
  });

  /**
   * =====================================
   * SLOT NOT FOUND
   * =====================================
   */

  if (!slot) {
    const alternatives = await suggestAlternativeSlots({
      doctor_id: appointment.doctor_id,
    });

    /**
     * NO ALTERNATIVES
     */

    if (!alternatives.length) {
      return {
        success: false,

        reply: isVoice
          ? "There are no available slots for the requested reschedule time."
          : "No available slots were found for the requested time.",
      };
    }

    /**
     * VOICE FORMAT
     */

    if (isVoice) {
      const voiceAlternatives = alternatives
        .slice(0, 3)
        .map((item) => {
          const start = new Date(item.start_time);

          return `on ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}`;
        })
        .join(". ");

      return {
        success: false,

        reply: `The requested slot is unavailable. Available alternatives include ${voiceAlternatives}.`,
      };
    }

    /**
     * TEXT FORMAT
     */

    const altText = alternatives
      .map((item) => {
        const start = new Date(item.start_time);

        return `• ${start.toLocaleDateString()} ${start.toLocaleTimeString()}`;
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
   * RELEASE OLD SLOT
   * =====================================
   */

  await slotRepo.update(
    {
      id: appointment.slot_id,
    },
    {
      is_booked: false,
    },
  );

  /**
   * =====================================
   * BOOK NEW SLOT
   * =====================================
   */

  await slotRepo.update(
    {
      id: slot.slot_id,
    },
    {
      is_booked: true,
    },
  );

  /**
   * =====================================
   * UPDATE APPOINTMENT
   * =====================================
   */

  appointment.slot_id = slot.slot_id;

  await appointmentRepo.save(appointment);

  /**
   * =====================================
   * GET DOCTOR
   * =====================================
   */

  const matchedDoctor = await profileRepo.findOne({
    where: {
      id: appointment.doctor_id,
    },
  });

  /**
   * =====================================
   * SUCCESS
   * =====================================
   */

  const start = new Date(slot.start_time);

  /**
   * VOICE
   */

  if (isVoice) {
    return {
      success: true,

      reply: `Your appointment has been rescheduled successfully with ${
        matchedDoctor?.title || "Dr"
      } ${matchedDoctor?.first_name} ${matchedDoctor?.last_name}.

Your new appointment is on ${start.toLocaleDateString()} at ${start.toLocaleTimeString()}.`,
    };
  }

  /**
   * TEXT
   */

  return {
    success: true,

    reply: `Appointment rescheduled successfully 🎉

Doctor:
${matchedDoctor?.title || "Dr"} ${matchedDoctor?.first_name} ${
      matchedDoctor?.last_name
    }

New Date:
${start.toLocaleDateString()}

New Time:
${start.toLocaleTimeString()}

Reference:
${appointment.id}`,
  };
}
