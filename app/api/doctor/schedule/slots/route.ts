export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { DoctorSlot } from "@/entities/DoctorSlot";

export async function GET(req: Request) {
  try {
    await dbClient.init();

    const { searchParams } = new URL(req.url);

    const date = searchParams.get("date"); // YYYY-MM-DD
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

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

    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    const now = new Date();

    const skip = (page - 1) * limit;

    // BASE QUERY
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

    // EXECUTE WITH PAGINATION
    const [slots, total] = await qb
      .orderBy("slot.start_time", "ASC")
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return NextResponse.json(
      {
        slots,
        empty: total === 0,
        message:
          total === 0
            ? "No available slots found"
            : "Success",
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