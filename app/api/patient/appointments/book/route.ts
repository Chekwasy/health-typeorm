export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Profile } from "@/entities/Profile";
import { DoctorSlot } from "@/entities/DoctorSlot";
import { Appointment } from "@/entities/Appointment";

interface Body {
  slot_id: string;
  reason: string;
}

export async function POST(req: Request) {
  try {
    await dbClient.init();

    const body: Body = await req.json();
    const { slot_id, reason } = body;

    if (!slot_id || !reason) {
      return NextResponse.json(
        { message: "slot_id and reason are required" },
        { status: 400 }
      );
    }

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
    const slotRepo = dbClient.client.getRepository(DoctorSlot);
    const appointmentRepo =
      dbClient.client.getRepository(Appointment);

    // ensure PATIENT role
    const profile = await profileRepo.findOne({
      where: { id: patient_id },
    });

    if (!profile || profile.role !== "PATIENT") {
      return NextResponse.json(
        { message: "Only patients can book" },
        { status: 403 }
      );
    }

    if (!profile.is_profile_complete) {
      return NextResponse.json(
        { message: "Complete profile first" },
        { status: 403 }
      );
    }

    // FETCH SLOT
    const slot = await slotRepo.findOne({
      where: { id: slot_id },
    });

    if (!slot) {
      return NextResponse.json(
        { message: "Slot not found" },
        { status: 404 }
      );
    }

    // already booked
    if (slot.is_booked) {
      return NextResponse.json(
        { message: "Slot already booked" },
        { status: 400 }
      );
    }

    // prevent past booking
    const now = new Date();
    if (slot.start_time < now) {
      return NextResponse.json(
        { message: "Cannot book past slot" },
        { status: 400 }
      );
    }

    // STEP 1: CREATE APPOINTMENT
    const appointment = appointmentRepo.create({
      doctor_id: slot.doctor_id,
      patient_id,
      slot_id,
      reason,
      status: "PENDING",
    });

    const savedAppointment = await appointmentRepo.save(
      appointment
    );

    // STEP 2: LOCK SLOT
    slot.is_booked = true;
    await slotRepo.save(slot);

    return NextResponse.json(
      {
        message: "Appointment booked successfully",
        appointment: savedAppointment,
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