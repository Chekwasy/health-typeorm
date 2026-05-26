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

type WeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

interface TimeBlock {
  start: string;

  end: string;
}

interface Body {
  interval: 15 | 30 | 60;

  days: string[];

  duration: 7 | 14 | 30;

  blocks: TimeBlock[];
}

/**
 * =========================================
 * VALID DAYS
 * =========================================
 */

const VALID_DAYS: WeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/**
 * =========================================
 * DAY MAP
 * =========================================
 */

const DAY_MAP: Record<WeekDay, number> = {
  MONDAY: 1,

  TUESDAY: 2,

  WEDNESDAY: 3,

  THURSDAY: 4,

  FRIDAY: 5,

  SATURDAY: 6,
};

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

    const { interval, days, duration, blocks } = body;

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
     * DURATION VALIDATION
     * =====================================
     */

    if (![7, 14, 30].includes(duration)) {
      return NextResponse.json(
        {
          message: "Duration must be 7, 14 or 30 days",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * DAYS VALIDATION
     * =====================================
     */

    if (!days || days.length === 0) {
      return NextResponse.json(
        {
          message: "Select at least one day",
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * BLOCKS VALIDATION
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
     * INVALID DAYS
     * =====================================
     */

    const invalidDays = days.filter((d) => !VALID_DAYS.includes(d as WeekDay));

    if (invalidDays.length > 0) {
      return NextResponse.json(
        {
          message: "Sunday scheduling is not allowed",

          invalid_days: invalidDays,
        },
        {
          status: 400,
        },
      );
    }

    /**
     * =====================================
     * TYPED DAYS
     * =====================================
     */

    const typedDays = days as WeekDay[];

    /**
     * =====================================
     * NORMALIZE BLOCKS
     * =====================================
     */

    const normalizedBlocks = blocks.map((block) => {
      const [startHour, startMinute] = block.start.split(":").map(Number);

      const [endHour, endMinute] = block.end.split(":").map(Number);

      const startMinutes = startHour * 60 + startMinute;

      const endMinutes = endHour * 60 + endMinute;

      return {
        ...block,

        startMinutes,

        endMinutes,
      };
    });

    /**
     * =====================================
     * INVALID RANGE
     * =====================================
     */

    for (const block of normalizedBlocks) {
      if (block.startMinutes >= block.endMinutes) {
        return NextResponse.json(
          {
            message: "Invalid time block range",
          },
          {
            status: 400,
          },
        );
      }
    }

    /**
     * =====================================
     * OVERLAP VALIDATION
     * =====================================
     */

    for (let i = 0; i < normalizedBlocks.length; i++) {
      for (let j = i + 1; j < normalizedBlocks.length; j++) {
        const a = normalizedBlocks[i];

        const b = normalizedBlocks[j];

        const overlaps =
          a.startMinutes < b.endMinutes && a.endMinutes > b.startMinutes;

        if (overlaps) {
          return NextResponse.json(
            {
              message: "Overlapping time blocks detected",
            },
            {
              status: 400,
            },
          );
        }
      }
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
     */

    const startWindow = new Date(now);

    startWindow.setHours(24, 0, 0, 0);

    /**
     * =====================================
     * END WINDOW
     * =====================================
     */

    const endWindow = new Date(startWindow);

    endWindow.setDate(endWindow.getDate() + duration - 1);

    /**
     * =====================================
     * DAY NUMBERS
     * =====================================
     */

    const selectedDayNumbers = typedDays.map((d) => DAY_MAP[d]);

    /**
     * =====================================
     * INSERT LIST
     * =====================================
     */

    const slotsToInsert: Partial<DoctorSlot>[] = [];

    /**
     * =====================================
     * DUPLICATE COUNT
     * =====================================
     */

    let duplicateSkipped = 0;

    /**
     * =====================================
     * LOOP DAYS
     * =====================================
     */

    const currentDay = new Date(startWindow);

    while (currentDay <= endWindow) {
      const weekDay = currentDay.getDay();

      /**
       * ===================================
       * SELECTED DAYS ONLY
       * ===================================
       */

      if (selectedDayNumbers.includes(weekDay)) {
        for (const block of normalizedBlocks) {
          /**
           * =================================
           * START DATE
           * =================================
           */

          const startDate = new Date(currentDay);

          startDate.setHours(
            Math.floor(block.startMinutes / 60),

            block.startMinutes % 60,

            0,

            0,
          );

          /**
           * =================================
           * END DATE
           * =================================
           */

          const endDate = new Date(currentDay);

          endDate.setHours(
            Math.floor(block.endMinutes / 60),

            block.endMinutes % 60,

            0,

            0,
          );

          /**
           * =================================
           * GENERATE SLOTS
           * =================================
           */

          let currentSlot = new Date(startDate);

          while (currentSlot < endDate) {
            /**
             * ===============================
             * SLOT END
             * ===============================
             */

            const slotEnd = new Date(currentSlot.getTime() + interval * 60000);

            /**
             * ===============================
             * OVERFLOW
             * ===============================
             */

            if (slotEnd > endDate) {
              break;
            }

            /**
             * ===============================
             * APPOINTMENT KEY
             * ===============================
             */

            const appointmentKey = formatAppointmentKey(currentSlot);

            const endKey = formatAppointmentKey(slotEnd);

            /**
             * ===============================
             * DUPLICATE CHECK
             * ===============================
             */

            const existingSlot = await slotRepo.findOne({
              where: {
                doctor_id: userId,

                start_time: appointmentKey,
              },
            });

            /**
             * ===============================
             * DUPLICATE
             * ===============================
             */

            if (existingSlot) {
              duplicateSkipped++;

              console.log("DUPLICATE SLOT SKIPPED", {
                appointment_key: appointmentKey,
              });
            } else {

            /**
             * ===============================
             * CREATE SLOT
             * ===============================
             */
              console.log("NEW SLOT GENERATED", {
                appointment_key: appointmentKey,

                end_key: endKey,
              });

              slotsToInsert.push({
                doctor_id: userId,

                /**
                 * NEW STRING FORMAT
                 */

                start_time: appointmentKey,

                end_time: endKey,

                is_booked: false,
              });
            }

            /**
             * ===============================
             * NEXT SLOT
             * ===============================
             */

            currentSlot = slotEnd;
          }
        }
      }

      /**
       * ===================================
       * NEXT DAY
       * ===================================
       */

      currentDay.setDate(currentDay.getDate() + 1);
    }

    /**
     * =====================================
     * NO VALID SLOTS
     * =====================================
     */

    if (slotsToInsert.length === 0) {
      return NextResponse.json(
        {
          message:
            duplicateSkipped > 0
              ? "All generated slots already exist"
              : "No valid slots generated",
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

    return NextResponse.json(
      {
        message:
          duplicateSkipped > 0
            ? "Recurring schedule created. Some duplicate slots were skipped."
            : "Recurring schedule created successfully",

        slots_created: slotsToInsert.length,

        duplicates_skipped: duplicateSkipped,

        active_days: typedDays,

        duration_days: duration,
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    /**
     * =====================================
     * ERROR
     * =====================================
     */

    console.error("RECURRING SCHEDULE ERROR:", err);

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
