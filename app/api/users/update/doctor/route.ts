export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Profile } from "@/entities/Profile";
import { DoctorProfile } from "@/entities/DoctorProfile";

interface Body {
  specialty?: string;
  bio?: string;
  years_of_experience?: number;
}

export async function PATCH(req: Request) {
  try {
    await dbClient.init();

    const body: Body = await req.json();

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
    const doctorRepo = dbClient.client.getRepository(DoctorProfile);

    // Ensure user is doctor
    const profile = await profileRepo.findOne({
      where: { id: userId },
    });

    if (!profile || profile.role !== "DOCTOR") {
      return NextResponse.json(
        { message: "Only doctors can update profile" },
        { status: 403 }
      );
    }

    // Validation + build update object
    const updates: Partial<DoctorProfile> = {};

    // SPECIALTY
    if (body.specialty !== undefined) {
      if (body.specialty.length < 2) {
        return NextResponse.json(
          { message: "Specialty too short" },
          { status: 400 }
        );
      }
      updates.specialty = body.specialty;
    }

    // BIO
    if (body.bio !== undefined) {
      if (body.bio.length < 10) {
        return NextResponse.json(
          { message: "Bio too short" },
          { status: 400 }
        );
      }
      updates.bio = body.bio;
    }

    // EXPERIENCE
    if (body.years_of_experience !== undefined) {
      if (body.years_of_experience < 0) {
        return NextResponse.json(
          { message: "Invalid experience value" },
          { status: 400 }
        );
      }
      updates.years_of_experience = body.years_of_experience;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Check if doctor profile exists
    let doctorProfile = await doctorRepo.findOne({
      where: { id: userId },
    });

    if (doctorProfile) {
      // UPDATE
      Object.assign(doctorProfile, updates);
      await doctorRepo.save(doctorProfile);
    } else {
      // CREATE
      doctorProfile = doctorRepo.create({
        id: userId,
        ...updates,
        is_verified: false,
      });

      await doctorRepo.save(doctorProfile);
    }

    // Mark profile as complete
    profile.is_profile_complete = true;
    await profileRepo.save(profile);

    return NextResponse.json({
      message: "Doctor profile updated successfully",
      profileComplete: true,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { message: "Server error" },
      { status: 500 }
    );
  }
}