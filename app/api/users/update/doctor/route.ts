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

  /**
   * SAVE THIS ON Profile TABLE
   */
  phone_number?: string;
}

export async function PATCH(req: Request) {
  try {
    await dbClient.init();

    const body: Body = await req.json();

    /**
     * =====================================
     * AUTH
     * =====================================
     */

    let decoded;

    try {
      decoded = await requireAuth(req);
    } catch (err: any) {
      return NextResponse.json(
        {
          message: err.message,
        },
        { status: 401 },
      );
    }

    const userId = decoded.userId;

    const profileRepo = dbClient.client.getRepository(Profile);

    const doctorRepo = dbClient.client.getRepository(DoctorProfile);

    /**
     * =====================================
     * ENSURE USER IS DOCTOR
     * =====================================
     */

    const profile = await profileRepo.findOne({
      where: {
        id: userId,
      },
    });

    if (!profile || profile.role !== "DOCTOR") {
      return NextResponse.json(
        {
          message: "Only doctors can update profile",
        },
        { status: 403 },
      );
    }

    /**
     * =====================================
     * VALIDATION
     * =====================================
     */

    const updates: Partial<DoctorProfile> = {};

    /**
     * SPECIALTY
     */

    if (body.specialty !== undefined) {
      if (body.specialty.trim().length < 2) {
        return NextResponse.json(
          {
            message: "Specialty too short",
          },
          { status: 400 },
        );
      }

      updates.specialty = body.specialty.trim();
    }

    /**
     * BIO
     */

    if (body.bio !== undefined) {
      if (body.bio.trim().length < 10) {
        return NextResponse.json(
          {
            message: "Bio too short",
          },
          { status: 400 },
        );
      }

      updates.bio = body.bio.trim();
    }

    /**
     * EXPERIENCE
     */

    if (body.years_of_experience !== undefined) {
      if (body.years_of_experience < 0) {
        return NextResponse.json(
          {
            message: "Invalid experience value",
          },
          { status: 400 },
        );
      }

      updates.years_of_experience = body.years_of_experience;
    }

    /**
     * =====================================
     * PHONE NUMBER
     * SAVE ONLY TO Profile TABLE
     * =====================================
     */

    if (body.phone_number !== undefined) {
      const normalizedPhone = body.phone_number.replace(/\s+/g, "");

      if (normalizedPhone.length < 7) {
        return NextResponse.json(
          {
            message: "Invalid phone number",
          },
          { status: 400 },
        );
      }

      /**
       * SAVE TO PROFILE TABLE
       */
      profile.phone = normalizedPhone;
    }

    /**
     * ENSURE THERE ARE VALID UPDATES
     */

    if (Object.keys(updates).length === 0 && body.phone_number === undefined) {
      return NextResponse.json(
        {
          message: "No valid fields to update",
        },
        { status: 400 },
      );
    }

    /**
     * =====================================
     * FIND PROFILE
     * =====================================
     */

    let doctorProfile = await doctorRepo.findOne({
      where: {
        id: userId,
      },
    });

    /**
     * =====================================
     * UPDATE PROFILE
     * =====================================
     */

    if (doctorProfile) {
      Object.assign(doctorProfile, updates);

      await doctorRepo.save(doctorProfile);
    } else if (Object.keys(updates).length > 0) {

    /**
     * =====================================
     * CREATE PROFILE
     * =====================================
     */
      doctorProfile = doctorRepo.create({
        id: userId,

        ...updates,

        is_verified: false,
      });

      await doctorRepo.save(doctorProfile);
    }

    /**
     * =====================================
     * MARK PROFILE COMPLETE
     * =====================================
     */

    profile.is_profile_complete = true;

    await profileRepo.save(profile);

    return NextResponse.json(
      {
        message: "Doctor profile updated successfully",

        profileComplete: true,

        data: {
          profile,

          doctorProfile,
        },
      },
      { status: 200 },
    );
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        message: "Server error",
      },
      { status: 500 },
    );
  }
}
