export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Appointment } from "@/entities/Appointment";

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

    const doctor_id = decoded.userId;

    // TRANSACTION
    await dbClient.client.transaction(async (manager) => {
      const appointmentRepo = manager.getRepository(Appointment);

      // FETCH APPOINTMENT
      const appointment = await appointmentRepo.findOne({
        where: { id: appointment_id },
      });

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      // Not owner
      if (appointment.doctor_id !== doctor_id) {
        throw new Error("Not allowed");
      }

      // Already cancelled
      if (
        appointment.status === "CANCELLED_BY_DOCTOR" ||
        appointment.status === "CANCELLED_BY_PATIENT"
      ) {
        throw new Error("Already cancelled");
      }

      // prevent cancelling past appointments
      // (recommended for consistency)
      // if (appointment.slot?.start_time < new Date()) {
      //   throw new Error("Cannot cancel past appointment");
      // }

      // UPDATE STATUS
      appointment.status = "CANCELLED_BY_DOCTOR";
      await appointmentRepo.save(appointment);

      // NOTE: NO SLOT UNLOCK HERE (intentional)
    });

    return NextResponse.json(
      {
        message: "Appointment cancelled by doctor",
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
            : err.message === "Already cancelled"
            ? 400
            : 500,
      }
    );
  }
}