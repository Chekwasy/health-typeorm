export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Profile } from "@/entities/Profile";
import { Appointment } from "@/entities/Appointment";

export async function GET(req: Request) {
  try {
    await dbClient.init();

    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = 5;
    const skip = (page - 1) * limit;

    // AUTH
    let decoded;
    try {
      decoded = await requireAuth(req);
    } catch (err: any) {
      return NextResponse.json(
        { message: err.message },
        { status: 401 }
      );
    }

    const patient_id = decoded.userId;

    const profileRepo = dbClient.client.getRepository(Profile);
    const appointmentRepo =
      dbClient.client.getRepository(Appointment);

    // ensure PATIENT
    const profile = await profileRepo.findOne({
      where: { id: patient_id },
    });

    if (!profile || profile.role !== "PATIENT") {
      return NextResponse.json(
        { message: "Only patients allowed" },
        { status: 403 }
      );
    }

    // FETCH APPOINTMENTS WITH RELATIONS
    const [appointments, total] =
      await appointmentRepo.findAndCount({
        where: { patient_id },
        relations: {
          doctor: true,
          slot: true,
        },
        order: {
          created_at: "DESC",
        },
        skip,
        take: limit,
      });

    // FORMAT RESPONSE
    const formatted = appointments.map((a) => ({
      id: a.id,
      reason: a.reason,
      status: a.status,
      created_at: a.created_at,

      doctor: a.doctor
        ? `${a.doctor.title ? a.doctor.title + " " : ""}${a.doctor.first_name} ${a.doctor.last_name}`
        : null,

      slot: a.slot
        ? {
            start_time: a.slot.start_time,
            end_time: a.slot.end_time,
          }
        : null,
    }));

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
          total_pages: total
            ? Math.ceil(total / limit)
            : 0,
        },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}