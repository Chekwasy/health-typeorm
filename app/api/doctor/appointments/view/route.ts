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
 * Converts:
 *
 * 2026-05-26-14-30
 *
 * ->
 *
 * JS Date
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
 * ROUTE
 * =========================================
 */

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
     * SEARCH PARAMS
     * =====================================
     */

    const { searchParams } = new URL(req.url);

    const page = Math.max(
      1,

      parseInt(searchParams.get("page") || "1"),
    );

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

    /**
     * =====================================
     * USER
     * =====================================
     */

    const doctor_id = decoded.userId;

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
     * ENSURE DOCTOR
     * =====================================
     */

    const profile = await profileRepo.findOne({
      where: {
        id: doctor_id,
      },

      select: ["id", "role"],
    });

    if (!profile || profile.role !== "DOCTOR") {
      return NextResponse.json(
        {
          message: "Only doctors allowed",
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
        doctor_id,
      },

      order: {
        created_at: "DESC",
      },

      skip,

      take: limit,
    });

    /**
     * =====================================
     * EMPTY
     * =====================================
     */

    if (appointments.length === 0) {
      return NextResponse.json(
        {
          appointments: [],

          empty: true,

          message: "No appointments found",

          pagination: {
            page,

            limit,

            total: 0,

            total_pages: 0,
          },
        },
        {
          status: 200,
        },
      );
    }

    /**
     * =====================================
     * PATIENT IDS
     * =====================================
     */

    const patientIds = [...new Set(appointments.map((a) => a.patient_id))];

    /**
     * =====================================
     * SLOT IDS
     * =====================================
     */

    const slotIds = [
      ...new Set(appointments.map((a) => a.slot_id).filter(Boolean)),
    ];

    /**
     * =====================================
     * LOAD PATIENTS
     * =====================================
     */

    let patients: Profile[] = [];

    if (patientIds.length > 0) {
      patients = await profileRepo.findBy({
        id: In(patientIds),
      });
    }

    /**
     * =====================================
     * LOAD SLOTS
     * =====================================
     */

    let slots: DoctorSlot[] = [];

    if (slotIds.length > 0) {
      slots = await slotRepo.findBy({
        id: In(slotIds),
      });
    }

    /**
     * =====================================
     * FORMAT RESPONSE
     * =====================================
     */

    const formatted = appointments.map((a) => {
      /**
       * =================================
       * PATIENT
       * =================================
       */

      const patient = patients.find((p) => p.id === a.patient_id);

      /**
       * =================================
       * SLOT
       * =================================
       */

      const slot = slots.find((s) => s.id === a.slot_id);

      /**
       * =================================
       * FRONTEND DATES
       * =================================
       */

      const startDate = appointmentKeyToDate(slot?.start_time);

      const endDate = appointmentKeyToDate(slot?.end_time);

      /**
       * =================================
       * RESPONSE
       * =================================
       */

      return {
        id: a.id,

        reason: a.reason,

        status: a.status,

        created_at: a.created_at,

        /**
         * ===============================
         * PATIENT
         * ===============================
         */

        patient: patient
          ? {
              id: patient.id,

              name: `${patient.first_name} ${patient.last_name}`,

              phone: patient.phone,
            }
          : null,

        /**
         * ===============================
         * SLOT
         * ===============================
         */

        slot: slot
          ? {
              id: slot.id,

              /**
               * RAW STRING
               */

              start_time: slot.start_time,

              end_time: slot.end_time,

              /**
               * FRONTEND DATE
               */

              start_date: startDate,

              end_date: endDate,

              is_booked: slot.is_booked,
            }
          : null,
      };
    });

    /**
     * =====================================
     * DEBUG
     * =====================================
     */

    console.log("DOCTOR APPOINTMENTS", {
      doctor_id,

      total,

      returned: formatted.length,
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
    /**
     * =====================================
     * ERROR
     * =====================================
     */

    console.error("DOCTOR APPOINTMENTS ERROR:", err);

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
