export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { DoctorSlot } from "@/entities/DoctorSlot";
import { Profile } from "@/entities/Profile";
import { DoctorProfile } from "@/entities/DoctorProfile";
import { In } from "typeorm"; // ✅ NEW

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

    // BASE QUERY
    const qb = slotRepo
      .createQueryBuilder("slot")
      .where("slot.is_booked = false")
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

    const slots = await qb
      .orderBy("slot.start_time", "ASC")
      .getMany();

    if (!slots.length) {
      return NextResponse.json(
        {
          doctors: [],
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

    // PAGINATE DOCTORS
    const paginatedDoctorIds = doctorIds.slice(
      skip,
      skip + limit
    );

    // FETCH RELATED DATA (UPDATED)
    const profiles = await profileRepo.find({
      where: {
        id: In(paginatedDoctorIds),
      },
    });

    const doctorProfiles = await doctorProfileRepo.find({
      where: {
        id: In(paginatedDoctorIds),
      },
    });

    // BUILD RESPONSE
    const doctors = paginatedDoctorIds.map((id) => {
      const doc = profiles.find((p) => p.id === id);
      const extra = doctorProfiles.find((d) => d.id === id);

      const doctorSlots = grouped[id] || [];

      const firstFew = doctorSlots.slice(0, 3);
      const lastFew =
        doctorSlots.length > 3
          ? doctorSlots.slice(-3)
          : [];

      return {
        doctor_id: id,
        name: `${doc?.title ? doc.title + " " : ""}${doc?.first_name} ${doc?.last_name}`,
        specialty: extra?.specialty || null,
        experience: extra?.years_of_experience || null,

        preview_slots: {
          first: firstFew,
          last: lastFew,
        },
      };
    });

    return NextResponse.json(
      {
        doctors,
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