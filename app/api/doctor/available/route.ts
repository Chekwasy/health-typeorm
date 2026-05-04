export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { DoctorSlot } from "@/entities/DoctorSlot";
import { Profile } from "@/entities/Profile";
import { DoctorProfile } from "@/entities/DoctorProfile";
import { In } from "typeorm";

export async function GET(req: Request) {
  try {
    await dbClient.init();

    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const date = searchParams.get("date");

    const skip = (page - 1) * limit;

    const slotRepo = dbClient.client.getRepository(DoctorSlot);
    const profileRepo = dbClient.client.getRepository(Profile);
    const doctorProfileRepo =
      dbClient.client.getRepository(DoctorProfile);

    const now = new Date();

    let slots: DoctorSlot[] = [];
    let message: string | null = null;

    // Helper → check Sunday
    const isSunday = (d: Date) => d.getDay() === 0;

    // PRIMARY QUERY
    const runQuery = async (start?: Date, end?: Date) => {
      const qb = slotRepo
        .createQueryBuilder("slot")
        .where("slot.is_booked = false")
        .andWhere("slot.start_time > :now", { now });

      if (start && end) {
        qb.andWhere(
          "slot.start_time BETWEEN :start AND :end",
          { start, end }
        );
      }

      return await qb
        .orderBy("slot.start_time", "ASC")
        .getMany();
    };

    // CASE 1: DATE PROVIDED
    if (date) {
      const selectedDate = new Date(`${date}T00:00:00.000Z`);

      if (isSunday(selectedDate)) {
        message =
          "No availability on Sunday. Showing next 3 days availability.";

        const next3Days = new Date(
          now.getTime() + 72 * 60 * 60 * 1000
        );

        slots = await runQuery(now, next3Days);
      } else {
        const startOfDay = new Date(`${date}T00:00:00.000Z`);
        const endOfDay = new Date(`${date}T23:59:59.999Z`);

        slots = await runQuery(startOfDay, endOfDay);

        // FALLBACK
        if (!slots.length) {
          message =
            "No doctors available for selected date. Showing next 3 days availability.";

          const next3Days = new Date(
            now.getTime() + 72 * 60 * 60 * 1000
          );

          slots = await runQuery(now, next3Days);
        }
      }
    } else {
      // DEFAULT LOAD
      if (isSunday(now)) {
        message =
          "No availability on Sunday. Showing next 3 days availability.";

        const next3Days = new Date(
          now.getTime() + 72 * 60 * 60 * 1000
        );

        slots = await runQuery(now, next3Days);
      } else {
        slots = await runQuery();
      }
    }

    // STILL EMPTY (edge case)
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
        { status: 200 }
      );
    }

    // GROUP BY DOCTOR
    const grouped: Record<string, DoctorSlot[]> = {};

    for (const slot of slots) {
      if (!grouped[slot.doctor_id]) {
        grouped[slot.doctor_id] = [];
      }
      grouped[slot.doctor_id].push(slot);
    }

    const doctorIds = Object.keys(grouped);

    const paginatedDoctorIds = doctorIds.slice(
      skip,
      skip + limit
    );

    const profiles = await profileRepo.find({
      where: { id: In(paginatedDoctorIds) },
    });

    const doctorProfiles = await doctorProfileRepo.find({
      where: { id: In(paginatedDoctorIds) },
    });

    const doctors = paginatedDoctorIds.map((id) => {
      const doc = profiles.find((p) => p.id === id);
      const extra = doctorProfiles.find((d) => d.id === id);

      const doctorSlots = grouped[id] || [];

      return {
        doctor_id: id,
        name: `${doc?.title ? doc.title + " " : ""}${doc?.first_name} ${doc?.last_name}`,
        specialty: extra?.specialty || null,
        experience: extra?.years_of_experience || null,

        preview_slots: {
          first: doctorSlots.slice(0, 3),
          last:
            doctorSlots.length > 3
              ? doctorSlots.slice(-3)
              : [],
        },
      };
    });

    return NextResponse.json(
      {
        doctors,
        message, // NEW
        pagination: {
          page,
          total: doctorIds.length,
          total_pages: Math.ceil(
            doctorIds.length / limit
          ),
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