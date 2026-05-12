export const runtime = "nodejs";

import dbClient from "@/lib/db";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { Profile } from "@/entities/Profile";
import { DoctorSlot } from "@/entities/DoctorSlot";
import { Between } from "typeorm";

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

const VALID_DAYS: WeekDay[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const DAY_MAP: Record<WeekDay, number> = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

export async function POST(req: Request) {
  try {
    await dbClient.init();

    const body: Body = await req.json();

    const {
      interval,
      days,
      duration,
      blocks,
    } = body;

    // AUTH
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
        }
      );
    }

    const userId = decoded.userId;

    const profileRepo =
      dbClient.client.getRepository(Profile);

    const slotRepo =
      dbClient.client.getRepository(DoctorSlot);

    // ROLE CHECK
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
        }
      );
    }

    if (!profile.is_profile_complete) {
      return NextResponse.json(
        {
          message: "Complete profile first",
        },
        {
          status: 403,
        }
      );
    }

    // VALIDATION
    if (![15, 30, 60].includes(interval)) {
      return NextResponse.json(
        {
          message: "Invalid interval",
        },
        {
          status: 400,
        }
      );
    }

    if (![7, 14, 30].includes(duration)) {
      return NextResponse.json(
        {
          message:
            "Duration must be 7, 14 or 30 days",
        },
        {
          status: 400,
        }
      );
    }

    if (!days || days.length === 0) {
      return NextResponse.json(
        {
          message:
            "Select at least one day",
        },
        {
          status: 400,
        }
      );
    }

    if (!blocks || blocks.length === 0) {
      return NextResponse.json(
        {
          message:
            "No schedule blocks provided",
        },
        {
          status: 400,
        }
      );
    }

    // RUNTIME DAY VALIDATION
    const invalidDays = days.filter(
      (d) => !VALID_DAYS.includes(d as WeekDay)
    );

    if (invalidDays.length > 0) {
      return NextResponse.json(
        {
          message:
            "Sunday scheduling is not allowed",
          invalid_days: invalidDays,
        },
        {
          status: 400,
        }
      );
    }

    const typedDays = days as WeekDay[];

    // BLOCK OVERLAP VALIDATION
    const normalizedBlocks = blocks.map(
      (block) => {
        const [startHour, startMinute] =
          block.start
            .split(":")
            .map(Number);

        const [endHour, endMinute] =
          block.end
            .split(":")
            .map(Number);

        const startMinutes =
          startHour * 60 + startMinute;

        const endMinutes =
          endHour * 60 + endMinute;

        return {
          ...block,
          startMinutes,
          endMinutes,
        };
      }
    );

    // invalid ranges
    for (const block of normalizedBlocks) {
      if (
        block.startMinutes >=
        block.endMinutes
      ) {
        return NextResponse.json(
          {
            message:
              "Invalid time block range",
          },
          {
            status: 400,
          }
        );
      }
    }

    // overlap detection
    for (
      let i = 0;
      i < normalizedBlocks.length;
      i++
    ) {
      for (
        let j = i + 1;
        j < normalizedBlocks.length;
        j++
      ) {
        const a = normalizedBlocks[i];
        const b = normalizedBlocks[j];

        const overlaps =
          a.startMinutes <
            b.endMinutes &&
          a.endMinutes >
            b.startMinutes;

        if (overlaps) {
          return NextResponse.json(
            {
              message:
                "Overlapping time blocks detected",
            },
            {
              status: 400,
            }
          );
        }
      }
    }

    // START FROM NEXT DAY 00:00
    const now = new Date();

    const startWindow = new Date(now);

    startWindow.setHours(24, 0, 0, 0);

    // END WINDOW
    const endWindow = new Date(startWindow);

    endWindow.setDate(
      endWindow.getDate() + duration - 1
    );

    const selectedDayNumbers =
      typedDays.map((d) => DAY_MAP[d]);

    const slotsToInsert: Partial<DoctorSlot>[] =
      [];

    let duplicateSkipped = 0;

    // LOOP THROUGH ALL DAYS
    const currentDay = new Date(startWindow);

    while (currentDay <= endWindow) {
      const weekDay = currentDay.getDay();

      // ONLY SELECTED DAYS
      if (
        selectedDayNumbers.includes(weekDay)
      ) {
        for (const block of normalizedBlocks) {
          const startDate = new Date(
            currentDay
          );

          startDate.setHours(
            Math.floor(
              block.startMinutes / 60
            ),
            block.startMinutes % 60,
            0,
            0
          );

          const endDate = new Date(
            currentDay
          );

          endDate.setHours(
            Math.floor(
              block.endMinutes / 60
            ),
            block.endMinutes % 60,
            0,
            0
          );

          // GENERATE SLOTS
          let currentSlot = new Date(
            startDate
          );

          while (currentSlot < endDate) {
            const slotEnd = new Date(
              currentSlot.getTime() +
                interval * 60000
            );

            if (slotEnd > endDate) {
              break;
            }

            // DUPLICATE CHECK
            const existingSlot =
              await slotRepo.findOne({
                where: {
                  doctor_id: userId,
                  start_time:
                    Between(
                      new Date(
                        currentSlot.getTime() -
                          1000
                      ),
                      new Date(
                        currentSlot.getTime() +
                          1000
                      )
                    ),
                },
              });

            if (existingSlot) {
              duplicateSkipped++;
            } else {
              slotsToInsert.push({
                doctor_id: userId,
                start_time: new Date(
                  currentSlot
                ),
                end_time: new Date(
                  slotEnd
                ),
                is_booked: false,
              });
            }

            currentSlot = slotEnd;
          }
        }
      }

      currentDay.setDate(
        currentDay.getDate() + 1
      );
    }

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
        }
      );
    }

    // SAVE
    await slotRepo.save(slotsToInsert);

    return NextResponse.json(
      {
        message:
          duplicateSkipped > 0
            ? "Recurring schedule created. Some duplicate slots were skipped."
            : "Recurring schedule created successfully",

        slots_created:
          slotsToInsert.length,

        duplicates_skipped:
          duplicateSkipped,

        active_days: typedDays,

        duration_days: duration,
      },
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error(
      "RECURRING SCHEDULE ERROR:",
      err
    );

    return NextResponse.json(
      {
        message: "Server error",
      },
      {
        status: 500,
      }
    );
  }
}
