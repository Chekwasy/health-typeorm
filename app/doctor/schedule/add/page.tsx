"use client";

import Nav from "@/app/components/nav";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Repeat,
  Clock3,
  ArrowRight,
} from "lucide-react";

export default function ScheduleTypePage() {
  const router = useRouter();

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,15,30,0.92), rgba(5,15,30,0.96)), url('/bg.jpeg')",
      }}
    >
      <Nav />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-10 text-white">
        {/* HERO */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-300 border border-green-500/20 px-4 py-2 rounded-full text-sm mb-5">
            <Clock3 size={16} />
            Doctor Scheduling System
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-5 leading-tight">
            Choose Your
            <span className="text-green-400">
              {" "}
              Scheduling Style
            </span>
          </h1>

          <p className="text-gray-300 max-w-2xl mx-auto text-lg leading-relaxed">
            Create one-time availability or automate recurring weekly schedules
            for patients to book appointments seamlessly.
          </p>
        </div>

        {/* CARDS */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* NON RECURRING */}
          <div className="bg-white/10 border border-white/10 rounded-3xl p-7 backdrop-blur hover:border-blue-500/40 transition">
            <div className="w-16 h-16 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-6">
              <CalendarDays
                size={32}
                className="text-blue-400"
              />
            </div>

            <h2 className="text-2xl font-bold mb-3">
              Non-Recurring Schedule
            </h2>

            <p className="text-gray-300 mb-6 leading-relaxed">
              Create custom availability manually by selecting exact dates and
              time ranges. Perfect for temporary schedules, special clinic days,
              short-term availability, or irregular working hours.
            </p>

            {/* FEATURES */}
            <div className="space-y-3 mb-8">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
                <p className="text-sm text-gray-300">
                  Select exact dates and time ranges
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
                <p className="text-sm text-gray-300">
                  Add multiple blocks with breaks in-between
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
                <p className="text-sm text-gray-300">
                  Best for changing schedules or special sessions
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
                <p className="text-sm text-gray-300">
                  Supports 15, 30 and 60 minute appointments
                </p>
              </div>
            </div>

            {/* EXAMPLE */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-4 mb-8">
              <p className="text-sm text-gray-400 mb-2">
                Example:
              </p>

              <p className="text-sm text-white">
                Monday May 12 → 9:00am - 12:00pm
              </p>

              <p className="text-sm text-white">
                Wednesday May 14 → 2:00pm - 5:00pm
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/doctor/schedule/add-non-recurring"
                )
              }
              className="w-full bg-blue-600 hover:bg-blue-700 transition rounded-2xl py-4 font-semibold flex items-center justify-center gap-2"
            >
              Create Non-Recurring Schedule
              <ArrowRight size={18} />
            </button>
          </div>

          {/* RECURRING */}
          <div className="bg-white/10 border border-white/10 rounded-3xl p-7 backdrop-blur hover:border-green-500/40 transition">
            <div className="w-16 h-16 rounded-2xl bg-green-500/20 flex items-center justify-center mb-6">
              <Repeat
                size={32}
                className="text-green-400"
              />
            </div>

            <h2 className="text-2xl font-bold mb-3">
              Recurring Schedule
            </h2>

            <p className="text-gray-300 mb-6 leading-relaxed">
              Automatically generate repeating schedules across selected weekdays
              for 7, 14 or 30 days. Perfect for doctors with consistent weekly
              availability.
            </p>

            {/* FEATURES */}
            <div className="space-y-3 mb-8">
              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                <p className="text-sm text-gray-300">
                  Automatically repeats schedules weekly
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                <p className="text-sm text-gray-300">
                  Select multiple weekdays at once
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                <p className="text-sm text-gray-300">
                  Duplicate and overlapping slots prevented automatically
                </p>
              </div>

              <div className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                <p className="text-sm text-gray-300">
                  Best for long-term weekly availability
                </p>
              </div>
            </div>

            {/* EXAMPLE */}
            <div className="bg-black/30 border border-white/10 rounded-2xl p-4 mb-8">
              <p className="text-sm text-gray-400 mb-2">
                Example:
              </p>

              <p className="text-sm text-white">
                Every Monday & Wednesday
              </p>

              <p className="text-sm text-white">
                9:00am - 12:00pm for the next 30 days
              </p>
            </div>

            <button
              onClick={() =>
                router.push(
                  "/doctor/schedule/add-recurring"
                )
              }
              className="w-full bg-green-600 hover:bg-green-700 transition rounded-2xl py-4 font-semibold flex items-center justify-center gap-2"
            >
              Create Recurring Schedule
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* FOOTER INFO */}
        <div className="mt-10 bg-white/10 border border-white/10 rounded-3xl p-6">
          <h3 className="font-semibold text-xl mb-3">
            Which should you use?
          </h3>

          <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-300">
            <div>
              <p className="font-semibold text-white mb-2">
                Use Non-Recurring if:
              </p>

              <ul className="space-y-2">
                <li>
                  • Your availability changes often
                </li>

                <li>
                  • You want exact date control
                </li>

                <li>
                  • You are scheduling temporary clinic sessions
                </li>
              </ul>
            </div>

            <div>
              <p className="font-semibold text-white mb-2">
                Use Recurring if:
              </p>

              <ul className="space-y-2">
                <li>
                  • You work fixed weekly schedules
                </li>

                <li>
                  • You want automatic slot generation
                </li>

                <li>
                  • You want to save time creating schedules
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}