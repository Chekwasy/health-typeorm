export const runtime = "nodejs";

import dbClient from "@/lib/db";

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

import { DoctorSlot } from "@/entities/DoctorSlot";

/**
 * =========================================
 * CONVERT KEY TO DATE
 * =========================================
 *
 * Converts:
 *
 * 2026-05-26-14-30
 *
 * ->
 *
 * JS Date
 * =========================================
 */

function appointmentKeyToDate(key: string) {
  const [year, month, day, hour, minute] = key.split("-").map(Number);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

/**
 * =========================================
 * ROUTE
 * =========================================
 */

export async function GET(req: Request) {
  try {
    /**
     * =====================================
     * DB INIT
     * =====================================
     */

    await dbClient.init();

    /**
     * =====================================
     * SEARCH PARAMS
     * =====================================
     */

    const { searchParams } = new URL(req.url);

    /**
     * =====================================
     * FILTERS
     * =====================================
     */

    const date = searchParams.get("date");

    /**
     * FORMAT:
     *
     * yyyy-MM-dd
     */

    const page = parseInt(searchParams.get("page") || "1");

    const limit = parseInt(searchParams.get("limit") || "20");

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
     * REPOSITORY
     * =====================================
     */

    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    /**
     * =====================================
     * PAGINATION
     * =====================================
     */

    const skip = (page - 1) * limit;

    /**
     * =====================================
     * NOW KEY
     * =====================================
     */

    const now = new Date();

    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0",
    )}-${String(now.getDate()).padStart(2, "0")}-${String(
      now.getHours(),
    ).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;

    /**
     * =====================================
     * BASE QUERY
     * =====================================
     */

    const qb = slotRepo
      .createQueryBuilder("slot")

      .where("slot.doctor_id = :doctor_id", {
        doctor_id,
      })

      .andWhere("slot.is_booked = false")

      /**
       * STRING DATE FILTER
       */

      .andWhere("slot.start_time > :nowKey", {
        nowKey,
      });

    /**
     * =====================================
     * DATE FILTER
     * =====================================
     *
     * FILTER:
     *
     * yyyy-MM-dd
     *
     * AGAINST:
     *
     * yyyy-MM-dd-HH-mm
     * =====================================
     */

    if (date) {
      qb.andWhere("slot.start_time LIKE :date", {
        date: `${date}%`,
      });
    }

    /**
     * =====================================
     * EXECUTE
     * =====================================
     */

    const [slots, total] = await qb
      .orderBy("slot.start_time", "ASC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    /**
     * =====================================
     * CONVERT TO FRONTEND DATES
     * =====================================
     */

    const transformedSlots = slots.map((slot: any) => ({
      ...slot,

      /**
       * FRONTEND DATE OBJECTS
       */

      start_date: appointmentKeyToDate(slot.start_time),

      end_date: appointmentKeyToDate(slot.end_time),
    }));

    /**
     * =====================================
     * DEBUG
     * =====================================
     */

    console.log(
      "AVAILABLE SLOTS",
      transformedSlots.map((slot: any) => ({
        id: slot.id,

        start_time: slot.start_time,

        start_date: slot.start_date,

        is_booked: slot.is_booked,
      })),
    );

    /**
     * =====================================
     * RESPONSE
     * =====================================
     */

    return NextResponse.json(
      {
        slots: transformedSlots,

        empty: total === 0,

        message: total === 0 ? "No available slots found" : "Success",

        pagination: {
          page,

          limit,

          total,

          total_pages: total ? Math.ceil(total / limit) : 0,
        },
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    /**
     * =====================================
     * ERROR
     * =====================================
     */

    console.error(err);

    return NextResponse.json(
      {
        message: "Server error",
      },
      {
        status: 500,
      },
    );
  }
}
