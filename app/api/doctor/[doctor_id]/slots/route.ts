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

    const url = new URL(req.url);

    // safer path extraction
    const parts = url.pathname.split("/");
    const doctor_id = parts[3];

    if (!doctor_id) {
      return NextResponse.json(
        { message: "doctor_id missing" },
        { status: 400 }
      );
    }

    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 10;
    const date = searchParams.get("date");

    const skip = (page - 1) * limit;

    const profileRepo = dbClient.client.getRepository(Profile);
    const doctorProfileRepo =
      dbClient.client.getRepository(DoctorProfile);
    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    const now = new Date();

    // GET DOCTOR BASIC INFO
    const profile = await profileRepo.findOne({
      where: {
        id: doctor_id,
        role: "DOCTOR",
      },
    });

    if (!profile) {
      return NextResponse.json(
        { message: "Doctor not found" },
        { status: 404 }
      );
    }

    // GET DOCTOR EXTRA INFO
    const extra = await doctorProfileRepo.findOne({
      where: { id: doctor_id },
    });

    // SLOT QUERY
    const qb = slotRepo
      .createQueryBuilder("slot")
      .where("slot.doctor_id = :doctor_id", { doctor_id })
      .andWhere("slot.is_booked = false")
      .andWhere("slot.start_time > :now", { now });

    // DATE FILTER
    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);

      qb.andWhere("slot.start_time BETWEEN :start AND :end", {
        start: startOfDay,
        end: endOfDay,
      });
    }

    const [slots, total] = await qb
      .orderBy("slot.start_time", "ASC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return NextResponse.json(
      {
        doctor: {
          doctor_id: profile.id,
          name: `${profile.title ? profile.title + " " : ""}${profile.first_name} ${profile.last_name}`,
          specialty: extra?.specialty || null,
          experience: extra?.years_of_experience || null,
          bio: extra?.bio || null,
        },

        slots,

        pagination: {
          page,
          limit,
          total,
          total_pages: total ? Math.ceil(total / limit) : 0,
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