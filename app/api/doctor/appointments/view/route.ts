export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Profile } from "@/entities/Profile";
import { Appointment } from "@/entities/Appointment";
import { In } from "typeorm";

export async function GET(req: Request) {
  try {
    await dbClient.init();

    const { searchParams } = new URL(req.url);

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1")
    );
    const limit = 5;
    const skip = (page - 1) * limit;

    // AUTH
    let decoded: any;
    try {
      decoded = await requireAuth(req);
    } catch (err: any) {
      return NextResponse.json(
        { message: err.message || "Unauthorized" },
        { status: 401 }
      );
    }

    const doctor_id = decoded.userId;

    const profileRepo = dbClient.client.getRepository(Profile);
    const appointmentRepo =
      dbClient.client.getRepository(Appointment);

    // ensure DOCTOR
    const profile = await profileRepo.findOne({
      where: { id: doctor_id },
      select: ["id", "role"],
    });

    if (!profile || profile.role !== "DOCTOR") {
      return NextResponse.json(
        { message: "Only doctors allowed" },
        { status: 403 }
      );
    }

    // FETCH APPOINTMENTS (ONLY SLOT RELATION)
    const [appointments, total] =
      await appointmentRepo.findAndCount({
        where: { doctor_id },
        relations: {
          slot: true, 
        },
        order: {
          created_at: "DESC",
        },
        skip,
        take: limit,
      });

    // FETCH PATIENTS SEPARATELY
    const patientIds = [
      ...new Set(appointments.map((a) => a.patient_id)),
    ];

    let patients: Profile[] = [];

    if (patientIds.length > 0) {
      patients = await profileRepo.findBy({
        id: In(patientIds),
      });
    }

    // FORMAT RESPONSE
    const formatted = appointments.map((a) => {
      const patient = patients.find(
        (p) => p.id === a.patient_id
      );

      return {
        id: a.id,
        reason: a.reason,
        status: a.status,
        created_at: a.created_at?.toISOString(),

        patient: patient
          ? {
              name: `${patient.first_name} ${patient.last_name}`,
              phone: patient.phone,
            }
          : null,

        slot: a.slot
          ? {
              start_time:
                a.slot.start_time?.toISOString(),
              end_time:
                a.slot.end_time?.toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json(
      {
        appointments: formatted,
        empty: total === 0,
        message:
          total === 0
            ? "No appointments found"
            : "Success",
        pagination: {
          page,
          limit,
          total,
          total_pages:
            total > 0 ? Math.ceil(total / limit) : 0,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("DOCTOR APPOINTMENTS ERROR:", err);

    return NextResponse.json(
      { message: err.message || "Server error" },
      { status: 500 }
    );
  }
}