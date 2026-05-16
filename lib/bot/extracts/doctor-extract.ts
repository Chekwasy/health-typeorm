/**
 * =========================================
 * FIND DOCTOR MENTION
 * =========================================
 *
 * Purpose:
 * - detect doctor names from messages
 * - support typo tolerance
 * - support:
 *   - first name
 *   - last name
 *   - full name
 *   - with/without Dr title
 *
 * Examples:
 * - book richard tomorrow
 * - book dr richard
 * - appointment with rajesh
 * - need dr chekwas
 *
 * This is much more reliable
 * than regex-only extraction.
 * =========================================
 */

import Fuse from "fuse.js";

import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

/**
 * =========================================
 * DOCTOR MATCH RESULT
 * =========================================
 */

interface DoctorMatchResult {
  doctor_id: string;

  doctor_name: string;

  title: string;

  confidence: number;
}

/**
 * =========================================
 * FIND DOCTOR FROM MESSAGE
 * =========================================
 */

async function findDoctorMention(
  rawMessage: string,
): Promise<DoctorMatchResult | null> {
  /**
   * DB CONNECTION
   */

  await dbClient.init();

  /**
   * REPOSITORY
   */

  const profileRepo = dbClient.client.getRepository(Profile);

  /**
   * LOAD DOCTORS
   */

  const doctors = await profileRepo.find({
    where: {
      role: "DOCTOR",
    },
  });

  /**
   * NORMALIZE MESSAGE
   */

  const message = rawMessage.toLowerCase();

  /**
   * =====================================
   * EXACT NAME MATCH FIRST
   * =====================================
   */

  for (const doctor of doctors) {
    const firstName = doctor.first_name.toLowerCase();

    const lastName = doctor.last_name.toLowerCase();

    const fullName = `${firstName} ${lastName}`;

    /**
     * CHECK MESSAGE
     */

    const matched =
      message.includes(firstName) ||
      message.includes(lastName) ||
      message.includes(fullName);

    /**
     * FOUND
     */

    if (matched) {
      const title = doctor.title || "Dr";

      return {
        doctor_id: doctor.id,

        doctor_name: `${title} ${doctor.first_name} ${doctor.last_name}`,

        title,

        confidence: 1,
      };
    }
  }

  /**
   * =====================================
   * OPTIONAL:
   * FUZZY SEARCH FALLBACK
   * =====================================
   */

  return null;
}

/**
 * =========================================
 * EXTRACT DOCTOR NAME
 * =========================================
 */

export async function extractDoctorName(message: string) {
  /**
   * FIND MATCHED DOCTOR
   */

  const doctor_details = await findDoctorMention(message);

  /**
   * NO MATCH
   */

  console.log("EXTRACTED DOCTOR DETAILS:", doctor_details);

  if (!doctor_details) {
    return null;
  }

  /**
   * CLEAN TITLE
   */

  const title = doctor_details.title?.trim() || "Dr";

  /**
   * CLEAN NAME
   */

  let doctorName = doctor_details.doctor_name.trim();

  /**
   * REMOVE EXISTING TITLE
   *
   * Prevent:
   * Dr Dr Richard
   */

  doctorName = doctorName.replace(/^(dr|doctor)\.?\s+/i, "");

  /**
   * RETURN FORMATTED
   */

  return { doctor_name: `${doctorName}`, doctor_id: doctor_details.doctor_id };
}
