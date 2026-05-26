export const runtime = "nodejs";

import dbClient from "@/lib/db";

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

import { Appointment } from "@/entities/Appointment";

import { DoctorSlot } from "@/entities/DoctorSlot";

/**
 * =========================================
 * EXTRACT DATE FROM KEY
 * =========================================
 *
 * INPUT:
 *
 * 2026-05-26-14-30
 *
 * OUTPUT:
 *
 * 2026-05-26
 * =========================================
 */

function extractDateFromKey(key?: string | null) {
  if (!key) {
    return null;
  }

  return key.split("-").slice(0, 3).join("-");
}

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

interface Body {
  appointment_id: string;
}

export async function PATCH(req: Request) {
  try {
    /**
     * =====================================
     * DB INIT
     * =====================================
     */

    await dbClient.init();

    /**
     * =====================================
     * BODY
     * =====================================
     */

    const body: Body = await req.json();

    const { appointment_id } = body;

    /**
     * =====================================
     * VALIDATION
     * =====================================
     */

    if (!appointment_id) {
      return NextResponse.json(
        {
          message: "appointment_id is required",
        },
        {
          status: 400,
        },
      );
    }

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
          message: err.message,
        },
        {
          status: 401,
        },
      );
    }

    const patient_id = decoded.userId;

    /**
     * =====================================
     * TRANSACTION
     * =====================================
     */

    await dbClient.client.transaction(async (manager) => {
      const appointmentRepo = manager.getRepository(Appointment);

      const slotRepo = manager.getRepository(DoctorSlot);

      /**
       * =================================
       * FETCH APPOINTMENT
       * =================================
       */

      const appointment = await appointmentRepo.findOne({
        where: {
          id: appointment_id,
        },
      });

      /**
       * =================================
       * NOT FOUND
       * =================================
       */

      if (!appointment) {
        throw new Error("Appointment not found");
      }

      /**
       * =================================
       * NOT OWNER
       * =================================
       */

      if (appointment.patient_id !== patient_id) {
        throw new Error("Not allowed");
      }

      /**
       * =================================
       * ALREADY CANCELLED
       * =================================
       */

      if (
        appointment.status === "CANCELLED_BY_PATIENT" ||
        appointment.status === "CANCELLED_BY_DOCTOR"
      ) {
        throw new Error("Already cancelled");
      }

      /**
       * =================================
       * FETCH SLOT
       * =================================
       */

      const slot = await slotRepo.findOne({
        where: {
          id: appointment.slot_id,
        },
      });

      /**
       * =================================
       * SLOT NOT FOUND
       * =================================
       */

      if (!slot) {
        throw new Error("Slot not found");
      }

      /**
       * =================================
       * TODAY KEY
       * =================================
       */

      const now = new Date();

      const todayKey = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      /**
       * =================================
       * SLOT DATE
       * =================================
       */

      const slotDate = extractDateFromKey(slot.start_time);

      /**
       * =================================
       * PAST APPOINTMENT
       * =================================
       */

      if (slotDate! < todayKey) {
        throw new Error("Cannot cancel past appointment");
      }

      /**
       * =================================
       * CANCEL APPOINTMENT
       * =================================
       */

      appointment.status = "CANCELLED_BY_PATIENT";

      await appointmentRepo.save(appointment);

      /**
       * =================================
       * RELEASE SLOT
       * =================================
       */

      slot.is_booked = false;

      await slotRepo.save(slot);

      /**
       * =================================
       * DEBUG LOG
       * =================================
       */

      console.log("APPOINTMENT CANCELLED", {
        appointment_id: appointment.id,

        slot_id: slot.id,

        slot_start: slot.start_time,

        patient_id,
      });
    });

    /**
     * =====================================
     * SUCCESS RESPONSE
     * =====================================
     */

    return NextResponse.json(
      {
        message: "Appointment cancelled successfully",
      },
      {
        status: 200,
      },
    );
  } catch (err: any) {
    console.error("CANCEL ERROR:", err);

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
      },
    );
  }
}
