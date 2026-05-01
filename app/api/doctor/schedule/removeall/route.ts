export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Profile } from "@/entities/Profile";
import { DoctorSlot } from "@/entities/DoctorSlot";

export async function DELETE(req: Request) {
  try {
    await dbClient.init();

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

    // Ensure doctor
    const profile = await profileRepo.findOne({
      where: { id: userId },
    });

    if (!profile || profile.role !== "DOCTOR") {
      return NextResponse.json(
        { message: "Only doctors allowed" },
        { status: 403 }
      );
    }

    // Find unbooked slots
    const slots = await slotRepo.find({
      where: {
        doctor_id: userId,
        is_booked: false,
      },
    });

    if (slots.length === 0) {
      return NextResponse.json(
        {
          message: "No available slots to delete",
          deleted_count: 0,
        },
        { status: 200 }
      );
    }

    // Remove them
    await slotRepo.remove(slots);

    return NextResponse.json(
      {
        message: "Schedule deleted successfully",
        deleted_count: slots.length,
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