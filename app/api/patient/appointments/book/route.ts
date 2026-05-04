export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Profile } from "@/entities/Profile";
import { DoctorSlot } from "@/entities/DoctorSlot";
import { Appointment } from "@/entities/Appointment";
import { In } from "typeorm";

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
    let decoded: any;
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

    // ensure PATIENT
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

    // RULE 1: MAX 4 BOOKINGS
    const now = new Date();

    const activeAppointmentsCount = await appointmentRepo
      .createQueryBuilder("a")
      .innerJoin("doctor_slots", "s", "s.id = a.slot_id")
      .where("a.patient_id = :patient_id", { patient_id })
      .andWhere("a.status IN (:...statuses)", {
        statuses: ["PENDING", "CONFIRMED"],
      })
      .andWhere("s.start_time > :now", { now })
      .getCount();

    if (activeAppointmentsCount >= 4) {
      return NextResponse.json(
        { message: "Maximum of 4 active bookings allowed" },
        { status: 400 }
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

    // past booking
    // const now = new Date();
    if (slot.start_time < now) {
      return NextResponse.json(
        { message: "Cannot book past slot" },
        { status: 400 }
      );
    }

    // RULE 2: PREVENT TIME CONFLICT
    // get patient appointments
    const patientAppointments =
      await appointmentRepo.find({
        where: {
          patient_id,
          status: In(["PENDING", "CONFIRMED"]),
        },
        relations: {
          slot: true,
        },
      });

    const hasConflict = patientAppointments.some((a) => {
      if (!a.slot) return false;

      const existingStart = a.slot.start_time;
      const existingEnd = a.slot.end_time;

      // overlap condition
      return (
        slot.start_time < existingEnd &&
        slot.end_time > existingStart
      );
    });

    if (hasConflict) {
      return NextResponse.json(
        {
          message:
            "You already have a booking at this time",
        },
        { status: 400 }
      );
    }

    // CREATE APPOINTMENT
    const appointment = appointmentRepo.create({
      doctor_id: slot.doctor_id,
      patient_id,
      slot_id,
      reason,
      status: "CONFIRMED", // auto-confirm for simplicity
    });

    const savedAppointment = await appointmentRepo.save(
      appointment
    );

    // LOCK SLOT
    slot.is_booked = true;
    await slotRepo.save(slot);

    return NextResponse.json(
      {
        message: "Appointment booked successfully",
        appointment: savedAppointment,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("BOOKING ERROR:", err);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}