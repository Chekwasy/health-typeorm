export const runtime = "nodejs";

import dbClient from "@/lib/db";

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

import { Profile } from "@/entities/Profile";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { Appointment } from "@/entities/Appointment";

import { In } from "typeorm";

/**
 * =========================================
 * CONVERT KEY TO DATE
 * =========================================
 *
 * INPUT:
 *
 * 2026-05-26-14-30
 *
 * OUTPUT:
 *
 * JS DATE
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
 *
 * INPUT:
 *
 * 2026-05-26-14-30
 *
 * OUTPUT:
 *
 * 2026-05-26
 * =========================================
 */

function extractDateFromKey(key?: string | null) {
  if (!key) {
    return null;
  }

  return key.split("-").slice(0, 3).join("-");
}

interface Body {
  slot_id: string;

  reason: string;
}

export async function POST(req: Request) {
  try {
    /**
     * =====================================
     * DB INIT
     * =====================================
     */

    await dbClient.init();

    /**
     * =====================================
     * BODY
     * =====================================
     */

    const body: Body = await req.json();

    const { slot_id, reason } = body;

    /**
     * =====================================
     * VALIDATION
     * =====================================
     */

    if (!slot_id || !reason) {
      return NextResponse.json(
        {
          message: "slot_id and reason are required",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * AUTH
     * =====================================
     */

    let decoded: any;

    try {
      decoded = await requireAuth(req);
    } catch (err: any) {
      return NextResponse.json(
        {
          message: err.message,
        },
        {
          status: 401,
        },
      );
    }

    const patient_id = decoded.userId;

    /**
     * =====================================
     * REPOSITORIES
     * =====================================
     */

    const profileRepo = dbClient.client.getRepository(Profile);

    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    const appointmentRepo = dbClient.client.getRepository(Appointment);

    /**
     * =====================================
     * ENSURE PATIENT
     * =====================================
     */

    const profile = await profileRepo.findOne({
      where: {
        id: patient_id,
      },
    });

    if (!profile || profile.role !== "PATIENT") {
      return NextResponse.json(
        {
          message: "Only patients can book",
        },
        {
          status: 403,
        },
      );
    }

    /**
     * =====================================
     * PROFILE COMPLETE
     * =====================================
     */

    if (!profile.is_profile_complete) {
      return NextResponse.json(
        {
          message: "Complete profile first",
        },
        {
          status: 403,
        },
      );
    }

    /**
     * =====================================
     * TODAY KEY
     * =====================================
     */

    const now = new Date();

    const todayKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    /**
     * =====================================
     * LOAD ACTIVE APPOINTMENTS
     * =====================================
     */

    const activeAppointments = await appointmentRepo.find({
      where: {
        patient_id,

        status: In(["PENDING", "CONFIRMED"]),
      },
    });

    /**
     * =====================================
     * LOAD SLOT IDS
     * =====================================
     */

    const activeSlotIds = activeAppointments
      .map((appointment) => appointment.slot_id)
      .filter(Boolean);

    /**
     * =====================================
     * LOAD ACTIVE SLOTS
     * =====================================
     */

    const activeSlots = await slotRepo.find({
      where: {
        id: In(activeSlotIds),
      },
    });

    /**
     * =====================================
     * SLOT MAP
     * =====================================
     */

    const slotMap = new Map(activeSlots.map((slot) => [slot.id, slot]));

    /**
     * =====================================
     * ACTIVE FUTURE BOOKINGS
     * =====================================
     */

    const validAppointments = activeAppointments.filter((appointment) => {
      const slot = slotMap.get(appointment.slot_id);

      /**
       * SLOT REQUIRED
       */

      if (!slot) {
        return false;
      }

      /**
       * FUTURE ONLY
       */

      const slotDate = extractDateFromKey(slot.start_time);

      return slotDate! >= todayKey;
    });

    /**
     * =====================================
     * MAX BOOKINGS
     * =====================================
     */

    if (validAppointments.length >= 4) {
      return NextResponse.json(
        {
          message: "Maximum of 4 active bookings allowed",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * FETCH SLOT
     * =====================================
     */

    const slot = await slotRepo.findOne({
      where: {
        id: slot_id,
      },
    });

    /**
     * =====================================
     * SLOT NOT FOUND
     * =====================================
     */

    if (!slot) {
      return NextResponse.json(
        {
          message: "Slot not found",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * =====================================
     * SLOT BOOKED
     * =====================================
     */

    if (slot.is_booked) {
      return NextResponse.json(
        {
          message: "Slot already booked",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * PAST SLOT
     * =====================================
     */

    const slotDate = extractDateFromKey(slot.start_time);

    if (slotDate! < todayKey) {
      return NextResponse.json(
        {
          message: "Cannot book past slot",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * PREVENT TIME CONFLICT
     * =====================================
     */

    const hasConflict = validAppointments.some((appointment) => {
      const existingSlot = slotMap.get(appointment.slot_id);

      if (!existingSlot) {
        return false;
      }

      /**
       * EXACT SAME SLOT
       */

      return existingSlot.start_time === slot.start_time;
    });

    /**
     * =====================================
     * CONFLICT
     * =====================================
     */

    if (hasConflict) {
      return NextResponse.json(
        {
          message: "You already have a booking at this time",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * CREATE APPOINTMENT
     * =====================================
     */

    const appointment = appointmentRepo.create({
      doctor_id: slot.doctor_id,

      patient_id,

      slot_id,

      reason,

      status: "CONFIRMED",
    });

    /**
     * =====================================
     * SAVE APPOINTMENT
     * =====================================
     */

    const savedAppointment = await appointmentRepo.save(appointment);

    /**
     * =====================================
     * LOCK SLOT
     * =====================================
     */

    slot.is_booked = true;

    await slotRepo.save(slot);

    /**
     * =====================================
     * DEBUG
     * =====================================
     */

    console.log("BOOKING SUCCESS", {
      appointment_id: savedAppointment.id,

      slot_id: slot.id,

      slot_start: slot.start_time,

      patient_id,
    });

    /**
     * =====================================
     * FRONTEND DATE
     * =====================================
     */

    const frontendStartDate = appointmentKeyToDate(slot.start_time);

    const frontendEndDate = appointmentKeyToDate(slot.end_time);

    /**
     * =====================================
     * RESPONSE
     * =====================================
     */

    return NextResponse.json(
      {
        message: "Appointment booked successfully",

        appointment: {
          ...savedAppointment,

          slot: {
            ...slot,

            start_date: frontendStartDate,

            end_date: frontendEndDate,
          },
        },
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("BOOKING ERROR:", err);

    return NextResponse.json(
      {
        message: "Server error",
      },
      {
        status: 500,
      },
    );
  }
}
