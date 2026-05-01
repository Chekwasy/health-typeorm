export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Profile } from "@/entities/Profile";
import { PatientProfile } from "@/entities/PatientProfile";

interface Body {
  gender?: "MALE" | "FEMALE" | "OTHER";
  date_of_birth?: string;
  blood_group?: string;

  allergies?: string;
  chronic_conditions?: string;
  current_medication?: string;

  emergency_contact_name?: string;
  emergency_contact_phone?: string;
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
    const patientRepo = dbClient.client.getRepository(PatientProfile);

    // Ensure PATIENT
    const profile = await profileRepo.findOne({
      where: { id: userId },
    });

    if (!profile || profile.role !== "PATIENT") {
      return NextResponse.json(
        { message: "Only patients allowed" },
        { status: 403 }
      );
    }

    // Build update object
    const updates: Partial<PatientProfile> = {};

    if (body.gender !== undefined) {
      updates.gender = body.gender;
    }

    if (body.date_of_birth !== undefined) {
      updates.date_of_birth = new Date(body.date_of_birth);
    }

    if (body.blood_group !== undefined) {
      updates.blood_group = body.blood_group;
    }

    if (body.allergies !== undefined) {
      updates.allergies = body.allergies;
    }

    if (body.chronic_conditions !== undefined) {
      updates.chronic_conditions = body.chronic_conditions;
    }

    if (body.current_medication !== undefined) {
      updates.current_medication = body.current_medication;
    }

    if (body.emergency_contact_name !== undefined) {
      updates.emergency_contact_name = body.emergency_contact_name;
    }

    if (body.emergency_contact_phone !== undefined) {
      updates.emergency_contact_phone = body.emergency_contact_phone;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Check if patient profile exists
    let patientProfile = await patientRepo.findOne({
      where: { id: userId },
    });

    if (patientProfile) {
      // UPDATE
      Object.assign(patientProfile, updates);
      await patientRepo.save(patientProfile);
    } else {
      // CREATE
      patientProfile = patientRepo.create({
        id: userId,
        ...updates,
      });

      await patientRepo.save(patientProfile);
    }

    // Mark profile as complete
    profile.is_profile_complete = true;
    await profileRepo.save(profile);

    return NextResponse.json({
      message: "Patient profile updated successfully",
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