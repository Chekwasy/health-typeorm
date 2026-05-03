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

    const patient_id = decoded.userId;

    const profileRepo = dbClient.client.getRepository(Profile);
    const appointmentRepo =
      dbClient.client.getRepository(Appointment);

    // Ensure PATIENT
    const profile = await profileRepo.findOne({
      where: { id: patient_id },
      select: ["id", "role"],
    });

    if (!profile || profile.role !== "PATIENT") {
      return NextResponse.json(
        { message: "Only patients allowed" },
        { status: 403 }
      );
    }

    // FETCH APPOINTMENTS (ONLY SLOT RELATION)
    const [appointments, total] =
      await appointmentRepo.findAndCount({
        where: { patient_id },
        relations: {
          slot: true, 
        },
        order: {
          created_at: "DESC",
        },
        skip,
        take: limit,
      });

    // 🔥 FETCH DOCTORS SEPARATELY
    const doctorIds = [
      ...new Set(appointments.map((a) => a.doctor_id)),
    ];


const doctors = await profileRepo.findBy({
  id: In(doctorIds),
});

    // 🔥 FORMAT RESPONSE
    const formatted = appointments.map((a) => {
      const doc = doctors.find(
        (d) => d.id === a.doctor_id
      );

      return {
        id: a.id,
        reason: a.reason,
        status: a.status,
        created_at: a.created_at?.toISOString(),

        doctor: doc
          ? `${doc.title ? doc.title + " " : ""}${doc.first_name} ${doc.last_name}`
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
    console.error("PATIENT APPOINTMENTS ERROR:", err);

    return NextResponse.json(
      { message: err.message || "Server error" },
      { status: 500 }
    );
  }
}