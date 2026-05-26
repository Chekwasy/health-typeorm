export const runtime = "nodejs";

import dbClient from "@/lib/db";

import { NextResponse } from "next/server";

import { DoctorSlot } from "@/entities/DoctorSlot";

import { Profile } from "@/entities/Profile";

import { DoctorProfile } from "@/entities/DoctorProfile";

import { In } from "typeorm";

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
 * BUILD NOW KEY
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
     * SEARCH PARAMS
     * =====================================
     */

    const { searchParams } = new URL(req.url);

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

    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    const profileRepo = dbClient.client.getRepository(Profile);

    const doctorProfileRepo = dbClient.client.getRepository(DoctorProfile);

    /**
     * =====================================
     * NOW
     * =====================================
     */

    const now = new Date();

    const nowKey = buildNowKey();

    /**
     * =====================================
     * DATA
     * =====================================
     */

    let slots: DoctorSlot[] = [];

    let message: string | null = null;

    /**
     * =====================================
     * CHECK SUNDAY
     * =====================================
     */

    const isSunday = (d: Date) => d.getDay() === 0;

    /**
     * =====================================
     * QUERY HELPER
     * =====================================
     */

    const runQuery = async (startKey?: string, endKey?: string) => {
      const qb = slotRepo
        .createQueryBuilder("slot")

        .where("slot.is_booked = false")

        /**
         * STRING DATE FILTER
         */

        .andWhere("slot.start_time > :nowKey", {
          nowKey,
        });

      /**
       * ===================================
       * RANGE FILTER
       * ===================================
       */

      if (startKey && endKey) {
        qb.andWhere("slot.start_time BETWEEN :startKey AND :endKey", {
          startKey,

          endKey,
        });
      }

      return await qb.orderBy("slot.start_time", "ASC").getMany();
    };

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
        message =
          "No availability on Sunday. Showing next 3 days availability.";

        /**
         * =================================
         * NEXT 3 DAYS
         * =================================
         */

        const future = new Date(now.getTime() + 72 * 60 * 60 * 1000);

        const endKey = `${future.getFullYear()}-${String(
          future.getMonth() + 1,
        ).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}-23-59`;

        slots = await runQuery(nowKey, endKey);
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

        slots = await runQuery(startKey, endKey);

        /**
         * =================================
         * FALLBACK
         * =================================
         */

        if (!slots.length) {
          message =
            "No doctors available for selected date. Showing next 3 days availability.";

          const future = new Date(now.getTime() + 72 * 60 * 60 * 1000);

          const futureKey = `${future.getFullYear()}-${String(
            future.getMonth() + 1,
          ).padStart(2, "0")}-${String(future.getDate()).padStart(
            2,
            "0",
          )}-23-59`;

          slots = await runQuery(nowKey, futureKey);
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
        message =
          "No availability on Sunday. Showing next 3 days availability.";

        const future = new Date(now.getTime() + 72 * 60 * 60 * 1000);

        const futureKey = `${future.getFullYear()}-${String(
          future.getMonth() + 1,
        ).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}-23-59`;

        slots = await runQuery(nowKey, futureKey);
      } else {

      /**
       * ===================================
       * NORMAL
       * ===================================
       */
        slots = await runQuery();
      }
    }

    /**
     * =====================================
     * EMPTY
     * =====================================
     */

    if (!slots.length) {
      return NextResponse.json(
        {
          doctors: [],

          message: message || "No availability found",

          pagination: {
            page,

            total: 0,

            total_pages: 0,
          },
        },
        {
          status: 200,
        },
      );
    }

    /**
     * =====================================
     * CONVERT FRONTEND DATES
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
     * GROUP BY DOCTOR
     * =====================================
     */

    const grouped: Record<string, any[]> = {};

    for (const slot of transformedSlots) {
      if (!grouped[slot.doctor_id]) {
        grouped[slot.doctor_id] = [];
      }

      grouped[slot.doctor_id].push(slot);
    }

    /**
     * =====================================
     * DOCTOR IDS
     * =====================================
     */

    const doctorIds = Object.keys(grouped);

    /**
     * =====================================
     * PAGINATION
     * =====================================
     */

    const paginatedDoctorIds = doctorIds.slice(skip, skip + limit);

    /**
     * =====================================
     * LOAD PROFILES
     * =====================================
     */

    const profiles = await profileRepo.find({
      where: {
        id: In(paginatedDoctorIds),
      },
    });

    /**
     * =====================================
     * LOAD EXTRA PROFILES
     * =====================================
     */

    const doctorProfiles = await doctorProfileRepo.find({
      where: {
        id: In(paginatedDoctorIds),
      },
    });

    /**
     * =====================================
     * BUILD DOCTORS
     * =====================================
     */

    const doctors = paginatedDoctorIds.map((id) => {
      const doc = profiles.find((p) => p.id === id);

      const extra = doctorProfiles.find((d) => d.id === id);

      const doctorSlots = grouped[id] || [];

      return {
        doctor_id: id,

        name: `${doc?.title ? doc.title + " " : ""}${doc?.first_name} ${
          doc?.last_name
        }`,

        specialty: extra?.specialty || null,

        experience: extra?.years_of_experience || null,

        /**
         * FRONTEND READY SLOTS
         */

        preview_slots: {
          first: doctorSlots.slice(0, 3),

          last: doctorSlots.length > 3 ? doctorSlots.slice(-3) : [],
        },
      };
    });

    /**
     * =====================================
     * DEBUG
     * =====================================
     */

    console.log("DISCOVER DOCTORS", {
      total_slots: transformedSlots.length,

      doctors: doctors.length,
    });

    /**
     * =====================================
     * RESPONSE
     * =====================================
     */

    return NextResponse.json(
      {
        doctors,

        message,

        pagination: {
          page,

          total: doctorIds.length,

          total_pages: Math.ceil(doctorIds.length / limit),
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
