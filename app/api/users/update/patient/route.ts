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

  phone_number?: string;

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

    const patientRepo = dbClient.client.getRepository(PatientProfile);

    /**
     * =====================================
     * ENSURE PATIENT
     * =====================================
     */

    const profile = await profileRepo.findOne({
      where: {
        id: userId,
      },
    });

    if (!profile || profile.role !== "PATIENT") {
      return NextResponse.json(
        {
          message: "Only patients allowed",
        },
        { status: 403 },
      );
    }

    /**
     * =====================================
     * BUILD UPDATE OBJECT
     * =====================================
     */

    const updates: Partial<PatientProfile> = {};

    /**
     * GENDER
     */

    if (body.gender !== undefined) {
      updates.gender = body.gender;
    }

    /**
     * DATE OF BIRTH
     */

    if (body.date_of_birth !== undefined) {
      updates.date_of_birth = new Date(body.date_of_birth);
    }

    /**
     * BLOOD GROUP
     */

    if (body.blood_group !== undefined) {
      updates.blood_group = body.blood_group.trim();
    }

    /**
     * PHONE NUMBER
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

      updates.phone_number = normalizedPhone;
    }

    /**
     * ALLERGIES
     */

    if (body.allergies !== undefined) {
      updates.allergies = body.allergies.trim();
    }

    /**
     * CHRONIC CONDITIONS
     */

    if (body.chronic_conditions !== undefined) {
      updates.chronic_conditions = body.chronic_conditions.trim();
    }

    /**
     * CURRENT MEDICATION
     */

    if (body.current_medication !== undefined) {
      updates.current_medication = body.current_medication.trim();
    }

    /**
     * EMERGENCY CONTACT NAME
     */

    if (body.emergency_contact_name !== undefined) {
      updates.emergency_contact_name = body.emergency_contact_name.trim();
    }

    /**
     * EMERGENCY CONTACT PHONE
     */

    if (body.emergency_contact_phone !== undefined) {
      const normalizedEmergencyPhone = body.emergency_contact_phone.replace(
        /\s+/g,
        "",
      );

      if (normalizedEmergencyPhone.length < 7) {
        return NextResponse.json(
          {
            message: "Invalid emergency contact phone",
          },
          { status: 400 },
        );
      }

      updates.emergency_contact_phone = normalizedEmergencyPhone;
    }

    /**
     * ENSURE VALID UPDATES
     */

    if (Object.keys(updates).length === 0) {
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

    let patientProfile = await patientRepo.findOne({
      where: {
        id: userId,
      },
    });

    /**
     * =====================================
     * UPDATE PROFILE
     * =====================================
     */

    if (patientProfile) {
      Object.assign(patientProfile, updates);

      await patientRepo.save(patientProfile);
    } else {
      /**
       * =====================================
       * CREATE PROFILE
       * =====================================
       */
      patientProfile = patientRepo.create({
        id: userId,

        ...updates,
      });

      await patientRepo.save(patientProfile);
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
        message: "Patient profile updated successfully",

        profileComplete: true,

        data: patientProfile,
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
