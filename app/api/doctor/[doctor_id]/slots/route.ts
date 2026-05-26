export const runtime = "nodejs";

import dbClient from "@/lib/db";

import { NextResponse } from "next/server";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { Profile } from "@/entities/Profile";

import { DoctorProfile } from "@/entities/DoctorProfile";

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

function appointmentKeyToDate(key?: string | null) {
  if (!key) {
    return null;
  }

  const [year, month, day, hour, minute] = key.split("-").map(Number);

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

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
 * ROUTE
 * =========================================
 */

export async function GET(req: Request) {
  try {
    /**
     * =====================================
     * INIT DB
     * =====================================
     */

    await dbClient.init();

    /**
     * =====================================
     * URL
     * =====================================
     */

    const url = new URL(req.url);

    const parts = url.pathname.split("/");

    const doctor_id = parts[3];

    /**
     * =====================================
     * VALIDATION
     * =====================================
     */

    if (!doctor_id) {
      return NextResponse.json(
        {
          message: "doctor_id missing",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * SEARCH PARAMS
     * =====================================
     */

    const searchParams = url.searchParams;

    const page = parseInt(searchParams.get("page") || "1");

    const limit = 10;

    /**
     * FORMAT:
     * yyyy-MM-dd
     */

    const date = searchParams.get("date");

    /**
     * =====================================
     * PAGINATION
     * =====================================
     */

    const skip = (page - 1) * limit;

    /**
     * =====================================
     * REPOSITORIES
     * =====================================
     */

    const profileRepo = dbClient.client.getRepository(Profile);

    const doctorProfileRepo = dbClient.client.getRepository(DoctorProfile);

    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    /**
     * =====================================
     * NOW KEY
     * =====================================
     */

    const now = new Date();

    const nowKey = buildNowKey();

    /**
     * =====================================
     * LOAD DOCTOR
     * =====================================
     */

    const profile = await profileRepo.findOne({
      where: {
        id: doctor_id,

        role: "DOCTOR",
      },
    });

    /**
     * =====================================
     * NOT FOUND
     * =====================================
     */

    if (!profile) {
      return NextResponse.json(
        {
          message: "Doctor not found",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * =====================================
     * LOAD EXTRA PROFILE
     * =====================================
     */

    const extra = await doctorProfileRepo.findOne({
      where: {
        id: doctor_id,
      },
    });

    /**
     * =====================================
     * CHECK SUNDAY
     * =====================================
     */

    const isSunday = (d: Date) => d.getDay() === 0;

    /**
     * =====================================
     * RESPONSE DATA
     * =====================================
     */

    let message: string | null = null;

    let slots: DoctorSlot[] = [];

    let total = 0;

    /**
     * =====================================
     * BASE QUERY
     * =====================================
     */

    const baseQuery = () =>
      slotRepo
        .createQueryBuilder("slot")

        .where("slot.doctor_id = :doctor_id", {
          doctor_id,
        })

        .andWhere("slot.is_booked = false")

        /**
         * STRING COMPARISON
         */

        .andWhere("slot.start_time > :nowKey", {
          nowKey,
        });

    /**
     * =====================================
     * DATE PROVIDED
     * =====================================
     */

    if (date) {
      const selectedDate = new Date(`${date}T00:00:00`);

      /**
       * ===================================
       * SUNDAY
       * ===================================
       */

      if (isSunday(selectedDate)) {
        message = "No availability on Sunday. Showing next available slots.";

        const qb = baseQuery();

        [slots, total] = await qb
          .orderBy("slot.start_time", "ASC")
          .skip(skip)
          .take(limit)
          .getManyAndCount();
      } else {

      /**
       * ===================================
       * NORMAL DATE
       * ===================================
       */
        /**
         * yyyy-MM-dd-HH-mm
         */

        const startKey = `${date}-00-00`;

        const endKey = `${date}-23-59`;

        const qb = baseQuery().andWhere(
          "slot.start_time BETWEEN :startKey AND :endKey",
          {
            startKey,

            endKey,
          },
        );

        [slots, total] = await qb
          .orderBy("slot.start_time", "ASC")
          .skip(skip)
          .take(limit)
          .getManyAndCount();

        /**
         * =================================
         * FALLBACK
         * =================================
         */

        if (total === 0) {
          message = "No slots for selected date. Showing next available slots.";

          const fallbackQb = baseQuery();

          [slots, total] = await fallbackQb
            .orderBy("slot.start_time", "ASC")
            .skip(skip)
            .take(limit)
            .getManyAndCount();
        }
      }
    } else {

    /**
     * =====================================
     * DEFAULT LOAD
     * =====================================
     */
      /**
       * ===================================
       * SUNDAY
       * ===================================
       */

      if (isSunday(now)) {
        message = "No availability on Sunday. Showing next available slots.";
      }

      const qb = baseQuery();

      [slots, total] = await qb
        .orderBy("slot.start_time", "ASC")
        .skip(skip)
        .take(limit)
        .getManyAndCount();
    }

    /**
     * =====================================
     * FRONTEND DATES
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

    console.log("DOCTOR SLOT FETCH", {
      doctor_id,

      total,

      returned: transformedSlots.length,
    });

    /**
     * =====================================
     * RESPONSE
     * =====================================
     */

    return NextResponse.json(
      {
        doctor: {
          doctor_id: profile.id,

          name: `${profile.title ? profile.title + " " : ""}${
            profile.first_name
          } ${profile.last_name}`,

          specialty: extra?.specialty || null,

          experience: extra?.years_of_experience || null,

          bio: extra?.bio || null,
        },

        /**
         * FRONTEND READY
         */

        slots: transformedSlots,

        /**
         * IMPORTANT
         */

        message,

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
