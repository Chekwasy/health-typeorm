export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Profile } from "@/entities/Profile";
import { DoctorSlot } from "@/entities/DoctorSlot";

interface Block {
  start: string;
  end: string;
}

interface Body {
  interval: 15 | 30 | 60;
  blocks: Block[];
}

export async function POST(req: Request) {
  try {
    await dbClient.init();

    const body: Body = await req.json();
    const { interval, blocks } = body;

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

    const userId = decoded.userId;

    const profileRepo = dbClient.client.getRepository(Profile);
    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    // CHECK ROLE
    const profile = await profileRepo.findOne({
      where: { id: userId },
    });

    if (!profile || profile.role !== "DOCTOR") {
      return NextResponse.json(
        { message: "Only doctors allowed" },
        { status: 403 }
      );
    }

    if (!profile.is_profile_complete) {
      return NextResponse.json(
        { message: "Complete profile first" },
        { status: 403 }
      );
    }

    // VALIDATION
    if (![15, 30, 60].includes(interval)) {
      return NextResponse.json(
        { message: "Invalid interval" },
        { status: 400 }
      );
    }

    if (!blocks || blocks.length === 0) {
      return NextResponse.json(
        { message: "No schedule blocks provided" },
        { status: 400 }
      );
    }

    const now = new Date();
    const maxTime = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    const slotsToInsert: Partial<DoctorSlot>[] = [];

    for (const block of blocks) {
      const start = new Date(block.start);
      const end = new Date(block.end);

      // invalid range
      if (start >= end) {
        return NextResponse.json(
          { message: "Invalid time range" },
          { status: 400 }
        );
      }

      // past time
      if (start < now) {
        return NextResponse.json(
          { message: "Cannot schedule in the past" },
          { status: 400 }
        );
      }

      // beyond 72 hours
      if (end > maxTime) {
        return NextResponse.json(
          { message: "Schedule exceeds 72 hours window" },
          { status: 400 }
        );
      }

      // GENERATE SLOTS
      let current = new Date(start);

      while (current < end) {
        const slotEnd = new Date(current.getTime() + interval * 60000);

        if (slotEnd > end) break;

        slotsToInsert.push({
          doctor_id: userId,
          start_time: current,
          end_time: slotEnd,
          is_booked: false,
        });

        current = slotEnd;
      }
    }

    if (slotsToInsert.length === 0) {
      return NextResponse.json(
        { message: "No valid slots generated" },
        { status: 400 }
      );
    }

    // INSERT using TypeORM
    await slotRepo.save(slotsToInsert);

    return NextResponse.json({
      message: "Schedule created successfully",
      slots_created: slotsToInsert.length,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}