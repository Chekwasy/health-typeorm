export const runtime = "nodejs";

import dbClient from "@/lib/db";

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

import { Appointment } from "@/entities/Appointment";

import { DoctorSlot } from "@/entities/DoctorSlot";

/**
 * =========================================
 * BUILD NOW KEY
 * =========================================
 *
 * FORMAT:
 *
 * yyyy-MM-dd-HH-mm
 * =========================================
 */

function buildNowKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(now.getDate()).padStart(2, "0")}-${String(
    now.getHours(),
  ).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
}

/**
 * =========================================
 * TYPES
 * =========================================
 */

interface Body {
  appointment_id: string;
}

/**
 * =========================================
 * ROUTE
 * =========================================
 */

export async function PATCH(req: Request) {
  try {
    /**
     * =====================================
     * INIT DB
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

    /**
     * =====================================
     * USER
     * =====================================
     */

    const doctor_id = decoded.userId;

    /**
     * =====================================
     * NOW KEY
     * =====================================
     */

    const nowKey = buildNowKey();

    /**
     * =====================================
     * TRANSACTION
     * =====================================
     */

    await dbClient.client.transaction(async (manager) => {
      /**
       * =================================
       * REPOSITORIES
       * =================================
       */

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

      if (appointment.doctor_id !== doctor_id) {
        throw new Error("Not allowed");
      }

      /**
       * =================================
       * ALREADY CONFIRMED
       * =================================
       */

      if (appointment.status === "CONFIRMED") {
        throw new Error("Already confirmed");
      }

      /**
       * =================================
       * CANCELLED
       * =================================
       */

      if (
        appointment.status === "CANCELLED_BY_DOCTOR" ||
        appointment.status === "CANCELLED_BY_PATIENT"
      ) {
        throw new Error("Cannot confirm a cancelled appointment");
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
       * DEBUG
       * =================================
       */

      console.log("CONFIRM APPOINTMENT CHECK", {
        appointment_id: appointment.id,

        slot_id: slot.id,

        slot_start_time: slot.start_time,

        now_key: nowKey,
      });

      /**
       * =================================
       * PAST APPOINTMENT
       * =================================
       *
       * STRING COMPARISON
       *
       * yyyy-MM-dd-HH-mm
       * =================================
       */

      if (slot.start_time < nowKey) {
        throw new Error("Cannot confirm past appointment");
      }

      /**
       * =================================
       * UPDATE STATUS
       * =================================
       */

      appointment.status = "CONFIRMED";

      /**
       * =================================
       * SAVE
       * =================================
       */

      await appointmentRepo.save(appointment);

      /**
       * =================================
       * SUCCESS LOG
       * =================================
       */

      console.log("APPOINTMENT CONFIRMED", {
        appointment_id: appointment.id,

        slot_time: slot.start_time,
      });
    });

    /**
     * =====================================
     * RESPONSE
     * =====================================
     */

    return NextResponse.json(
      {
        message: "Appointment confirmed successfully",
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
              : err.message === "Already confirmed" ||
                  err.message === "Cannot confirm a cancelled appointment" ||
                  err.message === "Cannot confirm past appointment"
                ? 400
                : 500,
      },
    );
  }
}
