export const runtime = "nodejs";

import dbClient from "@/lib/db";

import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";

import { Profile } from "@/entities/Profile";

import { DoctorSlot } from "@/entities/DoctorSlot";

/**
 * =========================================
 * TYPES
 * =========================================
 */

interface Block {
  start: string;

  end: string;
}

interface Body {
  interval: 15 | 30 | 60;

  blocks: Block[];
}

/**
 * =========================================
 * FORMAT APPOINTMENT KEY
 * =========================================
 *
 * FORMAT:
 *
 * yyyy-MM-dd-HH-mm
 *
 * Example:
 *
 * 2026-05-26-14-30
 * =========================================
 */

function formatAppointmentKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}-${String(
    date.getHours(),
  ).padStart(2, "0")}-${String(date.getMinutes()).padStart(2, "0")}`;
}

/**
 * =========================================
 * ROUTE
 * =========================================
 */

export async function POST(req: Request) {
  try {
    /**
     * =====================================
     * INIT DB
     * =====================================
     */

    await dbClient.init();

    /**
     * =====================================
     * BODY
     * =====================================
     */

    const body: Body = await req.json();

    const { interval, blocks } = body;

    /**
     * =====================================
     * AUTH
     * =====================================
     */

    let decoded: any;

    try {
      decoded = await requireAuth(req);
    } catch (err: any) {
      return NextResponse.json(
        {
          message: err.message,
        },
        {
          status: 401,
        },
      );
    }

    /**
     * =====================================
     * USER
     * =====================================
     */

    const userId = decoded.userId;

    /**
     * =====================================
     * REPOSITORIES
     * =====================================
     */

    const profileRepo = dbClient.client.getRepository(Profile);

    const slotRepo = dbClient.client.getRepository(DoctorSlot);

    /**
     * =====================================
     * ROLE CHECK
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
          message: "Only doctors allowed",
        },
        {
          status: 403,
        },
      );
    }

    /**
     * =====================================
     * PROFILE COMPLETE
     * =====================================
     */

    if (!profile.is_profile_complete) {
      return NextResponse.json(
        {
          message: "Complete profile first",
        },
        {
          status: 403,
        },
      );
    }

    /**
     * =====================================
     * INTERVAL VALIDATION
     * =====================================
     */

    if (![15, 30, 60].includes(interval)) {
      return NextResponse.json(
        {
          message: "Invalid interval",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * BLOCK VALIDATION
     * =====================================
     */

    if (!blocks || blocks.length === 0) {
      return NextResponse.json(
        {
          message: "No schedule blocks provided",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * NOW
     * =====================================
     */

    const now = new Date();

    /**
     * =====================================
     * START WINDOW
     * =====================================
     *
     * NEXT MIDNIGHT
     * =====================================
     */

    const startWindow = new Date(now);

    startWindow.setHours(24, 0, 0, 0);

    /**
     * =====================================
     * END WINDOW
     * =====================================
     */

    let endWindow = new Date(startWindow.getTime() + 72 * 60 * 60 * 1000);

    /**
     * =====================================
     * CHECK SUNDAY
     * =====================================
     */

    const hasSundayInRange = (() => {
      const temp = new Date(startWindow);

      while (temp <= endWindow) {
        if (temp.getDay() === 0) {
          return true;
        }

        temp.setDate(temp.getDate() + 1);
      }

      return false;
    })();

    /**
     * =====================================
     * EXTEND WINDOW
     * =====================================
     */

    if (hasSundayInRange) {
      endWindow = new Date(startWindow.getTime() + 96 * 60 * 60 * 1000);
    }

    /**
     * =====================================
     * INSERT LIST
     * =====================================
     */

    const slotsToInsert: Partial<DoctorSlot>[] = [];

    /**
     * =====================================
     * FLAGS
     * =====================================
     */

    let skippedSunday = false;

    let validSlotFound = false;

    /**
     * =====================================
     * PROCESS BLOCKS
     * =====================================
     */

    for (const block of blocks) {
      /**
       * ===================================
       * PARSE BLOCK
       * ===================================
       */

      const start = new Date(block.start);

      const end = new Date(block.end);

      /**
       * ===================================
       * INVALID RANGE
       * ===================================
       */

      if (start >= end) {
        return NextResponse.json(
          {
            message: "Invalid time range",
          },
          {
            status: 400,
          },
        );
      }

      /**
       * ===================================
       * PAST VALIDATION
       * ===================================
       */

      if (start < now) {
        return NextResponse.json(
          {
            message: "Cannot schedule in the past",
          },
          {
            status: 400,
          },
        );
      }

      /**
       * ===================================
       * WINDOW VALIDATION
       * ===================================
       */

      if (start < startWindow || end > endWindow) {
        return NextResponse.json(
          {
            message: "Schedule outside allowed window",
          },
          {
            status: 400,
          },
        );
      }

      /**
       * ===================================
       * SLOT GENERATION
       * ===================================
       */

      let current = new Date(start);

      while (current < end) {
        /**
         * ===============================
         * SLOT END
         * ===============================
         */

        const slotEnd = new Date(current.getTime() + interval * 60000);

        /**
         * ===============================
         * OVERFLOW
         * ===============================
         */

        if (slotEnd > end) {
          break;
        }

        /**
         * ===============================
         * SKIP SUNDAY
         * ===============================
         */

        if (current.getDay() === 0) {
          skippedSunday = true;
        } else {
          validSlotFound = true;

          /**
           * =============================
           * APPOINTMENT KEY
           * =============================
           */

          const appointmentKey = formatAppointmentKey(current);

          /**
           * =============================
           * DEBUG
           * =============================
           */

          console.log("GENERATED SLOT", {
            appointment_key: appointmentKey,

            start: current,

            end: slotEnd,
          });

          /**
           * =============================
           * INSERT SLOT
           * =============================
           */

          slotsToInsert.push({
            doctor_id: userId,

            /**
             * NEW STRING FORMAT
             */

            start_time: appointmentKey,

            end_time: formatAppointmentKey(slotEnd),

            is_booked: false,
          });
        }

        /**
         * ===============================
         * NEXT SLOT
         * ===============================
         */

        current = slotEnd;
      }
    }

    /**
     * =====================================
     * ALL SUNDAY
     * =====================================
     */

    if (!validSlotFound) {
      return NextResponse.json(
        {
          message: "Sundays cannot be scheduled",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * SAVE SLOTS
     * =====================================
     */

    await slotRepo.save(slotsToInsert);

    /**
     * =====================================
     * SUCCESS
     * =====================================
     */

    return NextResponse.json({
      message: skippedSunday
        ? "Schedule created. Sunday slots were skipped."
        : "Schedule created successfully",

      slots_created: slotsToInsert.length,
    });
  } catch (err) {
    /**
     * =====================================
     * ERROR
     * =====================================
     */

    console.error("SCHEDULE ERROR:", err);

    return NextResponse.json(
      {
        message: "Server error",
      },
      {
        status: 500,
      },
    );
  }
}
