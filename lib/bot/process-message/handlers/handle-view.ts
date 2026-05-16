import dbClient from "@/lib/db";

import { Profile } from "@/entities/Profile";

import { getUpcomingAppointments } from "../../helpers/upcoming-appointment";

/**
 * =========================================
 * HANDLE VIEW APPOINTMENTS
 * =========================================
 *
 * Purpose:
 * - fetch upcoming appointments
 * - format conversational response
 * - show doctor/date/time/reference
 * =========================================
 */

export async function handleView({ user_id }: { user_id: string }) {
  /**
   * =====================================
   * ENSURE DB CONNECTION
   * =====================================
   */

  await dbClient.init();

  /**
   * =====================================
   * FETCH APPOINTMENTS
   * =====================================
   */

  const appointments = await getUpcomingAppointments(user_id);

  /**
   * =====================================
   * NO APPOINTMENTS
   * =====================================
   */

  if (!appointments.length) {
    return {
      success: true,

      reply: "You currently have no upcoming appointments.",
    };
  }

  /**
   * =====================================
   * PROFILE REPOSITORY
   * =====================================
   */

  const profileRepo = dbClient.client.getRepository(Profile);

  /**
   * =====================================
   * BUILD RESPONSE LINES
   * =====================================
   */

  const lines = await Promise.all(
    appointments.map(async (appointment, index) => {
      /**
       * FIND DOCTOR
       */

      const doctor = await profileRepo.findOne({
        where: {
          id: appointment.doctor_id,
        },
      });

      /**
       * SLOT DATE
       */

      const start = new Date(appointment.slot.start_time);

      /**
       * FORMAT RESPONSE
       */

      return `${index + 1}. ${doctor?.title || "Dr"} ${doctor?.first_name} ${
        doctor?.last_name
      }

Date:
${start.toLocaleDateString()}

Time:
${start.toLocaleTimeString()}

Status:
${appointment.status}

Reference:
${appointment.id}`;
    }),
  );

  /**
   * =====================================
   * FINAL RESPONSE
   * =====================================
   */

  return {
    success: true,

    reply: `Your upcoming appointments:

${lines.join("\n\n")}`,
  };
}
