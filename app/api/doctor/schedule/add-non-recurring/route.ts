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
    let decoded: any;
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

    // ROLE CHECK
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

    // START WINDOW → next midnight
    const startWindow = new Date(now);
    startWindow.setHours(24, 0, 0, 0); // next day 00:00

    let endWindow = new Date(
      startWindow.getTime() + 72 * 60 * 60 * 1000
    );

    // CHECK IF SUNDAY EXISTS IN RANGE
    const hasSundayInRange = (() => {
      const temp = new Date(startWindow);

      while (temp <= endWindow) {
        if (temp.getDay() === 0) return true;
        temp.setDate(temp.getDate() + 1);
      }

      return false;
    })();

    // EXTEND TO 96 HOURS IF SUNDAY EXISTS
    if (hasSundayInRange) {
      endWindow = new Date(
        startWindow.getTime() + 96 * 60 * 60 * 1000
      );
    }

    const slotsToInsert: Partial<DoctorSlot>[] = [];

    let skippedSunday = false;
    let validSlotFound = false;

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

      // past
      if (start < now) {
        return NextResponse.json(
          { message: "Cannot schedule in the past" },
          { status: 400 }
        );
      }

      // outside window
      if (start < startWindow || end > endWindow) {
        return NextResponse.json(
          { message: "Schedule outside allowed window" },
          { status: 400 }
        );
      }

      // GENERATE SLOTS
      let current = new Date(start);

      while (current < end) {
        const slotEnd = new Date(
          current.getTime() + interval * 60000
        );

        if (slotEnd > end) break;

        // SKIP SUNDAY
        if (current.getDay() === 0) {
          skippedSunday = true;
        } else {
          validSlotFound = true;

          slotsToInsert.push({
            doctor_id: userId,
            start_time: new Date(current),
            end_time: new Date(slotEnd),
            is_booked: false,
          });
        }

        current = slotEnd;
      }
    }

    // ALL WERE SUNDAY
    if (!validSlotFound) {
      return NextResponse.json(
        {
          message: "Sundays cannot be scheduled",
        },
        { status: 400 }
      );
    }

    // INSERT
    await slotRepo.save(slotsToInsert);

    return NextResponse.json({
      message: skippedSunday
        ? "Schedule created. Sunday slots were skipped."
        : "Schedule created successfully",
      slots_created: slotsToInsert.length,
    });
  } catch (err) {
    console.error("SCHEDULE ERROR:", err);

    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}