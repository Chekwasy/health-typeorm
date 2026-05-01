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

    const doctor_id = decoded.userId;

    const profileRepo = dbClient.client.getRepository(Profile);
    const appointmentRepo =
      dbClient.client.getRepository(Appointment);

    // ensure DOCTOR
    const profile = await profileRepo.findOne({
      where: { id: doctor_id },
    });

    if (!profile || profile.role !== "DOCTOR") {
      return NextResponse.json(
        { message: "Only doctors allowed" },
        { status: 403 }
      );
    }

    // FETCH APPOINTMENTS WITH RELATIONS
    const [appointments, total] =
      await appointmentRepo.findAndCount({
        where: { doctor_id },
        relations: {
          patient: true,
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

      patient: a.patient
        ? {
            name: `${a.patient.first_name} ${a.patient.last_name}`,
            phone: a.patient.phone,
          }
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
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}