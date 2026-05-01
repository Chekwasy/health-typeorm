export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Appointment } from "@/entities/Appointment";
import { DoctorSlot } from "@/entities/DoctorSlot";

interface Body {
  appointment_id: string;
}

export async function PATCH(req: Request) {
  try {
    await dbClient.init();

    const body: Body = await req.json();
    const { appointment_id } = body;

    if (!appointment_id) {
      return NextResponse.json(
        { message: "appointment_id is required" },
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

    // TRANSACTION (IMPORTANT)
    await dbClient.client.transaction(async (manager) => {
      const appointmentRepo = manager.getRepository(Appointment);
      const slotRepo = manager.getRepository(DoctorSlot);

      // FETCH APPOINTMENT
      const appointment = await appointmentRepo.findOne({
        where: { id: appointment_id },
      });

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      // Not owner
      if (appointment.patient_id !== patient_id) {
        throw new Error("Not allowed");
      }

      // Already cancelled
      if (
        appointment.status === "CANCELLED_BY_PATIENT" ||
        appointment.status === "CANCELLED_BY_DOCTOR"
      ) {
        throw new Error("Already cancelled");
      }

      // FETCH SLOT
      const slot = await slotRepo.findOne({
        where: { id: appointment.slot_id },
      });

      if (!slot) {
        throw new Error("Slot not found");
      }

      const now = new Date();

      // Past appointment
      if (slot.start_time < now) {
        throw new Error("Cannot cancel past appointment");
      }

      // STEP 1: CANCEL APPOINTMENT
      appointment.status = "CANCELLED_BY_PATIENT";
      await appointmentRepo.save(appointment);

      // STEP 2: UNLOCK SLOT
      slot.is_booked = false;
      await slotRepo.save(slot);
    });

    return NextResponse.json(
      {
        message: "Appointment cancelled successfully",
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error(err);

    return NextResponse.json(
      {
        message: err.message || "Server error",
      },
      {
        status:
          err.message === "Appointment not found"
            ? 404
            : err.message === "Not allowed"
            ? 403
            : err.message === "Already cancelled" ||
              err.message === "Cannot cancel past appointment"
            ? 400
            : 500,
      }
    );
  }
}