import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

/**
 * =========================================
 * FIND DOCTOR BY NAME
 * =========================================
 */

export async function findDoctorByName(doctorName: string) {
  await dbClient.init();

  const profileRepo = dbClient.client.getRepository(Profile);

  /**
   * CLEAN NAME
   */

  const cleanName = doctorName.replace(/dr\.?/i, "").trim().toLowerCase();

  /**
   * GET DOCTORS
   */

  const doctors = await profileRepo.find({
    where: {
      role: "DOCTOR",
    },
  });

  /**
   * MATCH
   */

  const matchedDoctor = doctors.find((doctor) => {
    const firstName = doctor.first_name.toLowerCase();

    const lastName = doctor.last_name.toLowerCase();

    const fullName = `${firstName} ${lastName}`;

    return (
      fullName.includes(cleanName) ||
      cleanName.includes(firstName) ||
      cleanName.includes(lastName)
    );
  });

  /**
   * LOG
   */

  console.log("DOCTOR LOOKUP:", {
    search: doctorName,

    matched: matchedDoctor?.id || null,
  });

  return matchedDoctor || null;
}
