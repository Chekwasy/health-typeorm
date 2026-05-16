import dbClient from "@/lib/db";

import { DoctorProfile } from "@/entities/DoctorProfile";

import { Profile } from "@/entities/Profile";

/**
 * =========================================
 * FIND DOCTOR BY SPECIALIZATION
 * =========================================
 */

export async function findDoctorBySpecialization(specialization: string) {
  await dbClient.init();

  const doctorProfileRepo = dbClient.client.getRepository(DoctorProfile);

  const profileRepo = dbClient.client.getRepository(Profile);

  /**
   * FIND MATCHING
   */

  const doctorProfiles = await doctorProfileRepo.find();

  const matchedProfile = doctorProfiles.find((profile) =>
    profile.specialty?.toLowerCase().includes(specialization.toLowerCase()),
  );

  if (!matchedProfile) {
    return null;
  }

  /**
   * GET PROFILE
   */

  const doctor = await profileRepo.findOne({
    where: {
      id: matchedProfile.id,
    },
  });

  return doctor || null;
}
