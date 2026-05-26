export const runtime = "nodejs";

import dbClient from "@/lib/db";

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

import { Profile } from "@/entities/Profile";

import { Appointment } from "@/entities/Appointment";

import { DoctorSlot } from "@/entities/DoctorSlot";

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

export async function GET(req: Request) {
  try {
    /**
     * =====================================
     * DB INIT
     * =====================================
     */

    await dbClient.init();

    /**
     * =====================================
     * QUERY PARAMS
     * =====================================
     */

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));

    const limit = 5;

    const skip = (page - 1) * limit;

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
          message: err.message || "Unauthorized",
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

    const appointmentRepo = dbClient.client.getRepository(Appointment);

    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    /**
     * =====================================
     * ENSURE PATIENT
     * =====================================
     */

    const profile = await profileRepo.findOne({
      where: {
        id: patient_id,
      },

      select: ["id", "role"],
    });

    if (!profile || profile.role !== "PATIENT") {
      return NextResponse.json(
        {
          message: "Only patients allowed",
        },
        {
          status: 403,
        },
      );
    }

    /**
     * =====================================
     * FETCH APPOINTMENTS
     * =====================================
     */

    const [appointments, total] = await appointmentRepo.findAndCount({
      where: {
        patient_id,
      },

      order: {
        created_at: "DESC",
      },

      skip,

      take: limit,
    });

    /**
     * =====================================
     * DOCTOR IDS
     * =====================================
     */

    const doctorIds = [...new Set(appointments.map((a) => a.doctor_id))];

    /**
     * =====================================
     * SLOT IDS
     * =====================================
     */

    const slotIds = [...new Set(appointments.map((a) => a.slot_id))];

    /**
     * =====================================
     * LOAD DOCTORS
     * =====================================
     */

    const doctors = doctorIds.length
      ? await profileRepo.findBy({
          id: In(doctorIds),
        })
      : [];

    /**
     * =====================================
     * LOAD SLOTS
     * =====================================
     */

    const slots = slotIds.length
      ? await slotRepo.findBy({
          id: In(slotIds),
        })
      : [];

    /**
     * =====================================
     * SLOT MAP
     * =====================================
     */

    const slotMap = new Map(slots.map((slot) => [slot.id, slot]));

    /**
     * =====================================
     * FORMAT RESPONSE
     * =====================================
     */

    const formatted = appointments.map((appointment) => {
      const doctor = doctors.find((d) => d.id === appointment.doctor_id);

      const slot = slotMap.get(appointment.slot_id);

      /**
       * FRONTEND DATE
       */

      const startDate = appointmentKeyToDate(slot?.start_time);

      const endDate = appointmentKeyToDate(slot?.end_time);

      return {
        id: appointment.id,

        reason: appointment.reason,

        status: appointment.status,

        created_at: appointment.created_at?.toISOString(),

        doctor: doctor
          ? `${doctor.title ? doctor.title + " " : ""}${doctor.first_name} ${doctor.last_name}`
          : null,

        slot: slot
          ? {
              id: slot.id,

              start_time: slot.start_time,

              end_time: slot.end_time,

              start_date: startDate,

              end_date: endDate,

              is_booked: slot.is_booked,
            }
          : null,
      };
    });

    /**
     * =====================================
     * RESPONSE
     * =====================================
     */

    return NextResponse.json(
      {
        appointments: formatted,

        empty: total === 0,

        message: total === 0 ? "No appointments found" : "Success",

        pagination: {
          page,

          limit,

          total,

          total_pages: total > 0 ? Math.ceil(total / limit) : 0,
        },
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("PATIENT APPOINTMENTS ERROR:", err);

    return NextResponse.json(
      {
        message: err.message || "Server error",
      },
      {
        status: 500,
      },
    );
  }
}
