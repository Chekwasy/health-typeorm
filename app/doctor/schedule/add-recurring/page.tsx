"use client";

import Nav from "@/app/components/nav";
import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

export default function RecurringSchedulePage() {
  const router = useRouter();

  const [interval, setInterval] = useState(30);

  const [duration, setDuration] = useState(7);

  const [selectedDays, setSelectedDays] = useState<
    string[]
  >([]);

  const [blocks, setBlocks] = useState([
    {
      start: "",
      end: "",
    },
  ]);

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(
        selectedDays.filter((d) => d !== day)
      );
    } else {
      setSelectedDays([
        ...selectedDays,
        day,
      ]);
    }
  };

  const addBlock = () => {
    setBlocks([
      ...blocks,
      {
        start: "",
        end: "",
      },
    ]);
  };

  const removeBlock = (index: number) => {
    setBlocks(
      blocks.filter((_, i) => i !== index)
    );
  };

  const handleBlockChange = (
    index: number,
    field: "start" | "end",
    value: string
  ) => {
    const updated = [...blocks];

    updated[index][field] = value;

    setBlocks(updated);
  };

  const handleSubmit = async () => {
    try {
      if (selectedDays.length === 0) {
        return toast.error(
          "Select at least one day"
        );
      }

      const invalidBlock = blocks.some(
        (b) => !b.start || !b.end
      );

      if (invalidBlock) {
        return toast.error(
          "All blocks must have start and end time"
        );
      }

      const token =
        Cookies.get("access_token");

      const loading = toast.loading(
        "Creating recurring schedule..."
      );

      const res = await axios.post(
        "/api/doctor/schedule/add-recurring",
        {
          interval,
          duration,
          days: selectedDays,
          blocks,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(
        res.data.message ||
          "Schedule created successfully",
        {
          id: loading,
        }
      );

      router.push(
        "/doctor/schedule/view"
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Something went wrong"
      );
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,15,30,0.92), rgba(5,15,30,0.95)), url('/bg.jpeg')",
      }}
    >
      <Nav />

      <div className="max-w-3xl mx-auto px-4 pt-24 pb-10 text-white">
        {/* HEADER */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Recurring Schedule
          </h1>

          <p className="text-gray-300 mt-2">
            Create repeating availability
            across multiple days for the
            next 7, 14 or 30 days.
          </p>
        </div>

        {/* GUIDE */}
        <div className="bg-white/10 border border-white/10 rounded-2xl p-5 mb-8 backdrop-blur">
          <h2 className="font-semibold text-lg mb-3">
            Scheduling Guide
          </h2>

          <ul className="space-y-2 text-sm text-gray-300">
            <li>
              • Select the days you want
              patients to book you.
            </li>

            <li>
              • Add one or multiple time
              blocks for each selected day.
            </li>

            <li>
              • The system automatically
              splits blocks into 15, 30 or
              60 minute appointments.
            </li>

            <li>
              • Example:
              09:00-12:00 with 30 minutes
              creates 6 appointment slots.
            </li>

            <li>
              • You can add multiple
              blocks like morning and
              evening sessions.
            </li>

            <li>
              • Sundays are automatically
              blocked.
            </li>

            <li>
              • Duplicate schedules are
              skipped automatically.
            </li>

            <li>
              • Overlapping time blocks
              are prevented automatically.
            </li>
          </ul>
        </div>

        {/* INTERVAL */}
        <div className="bg-white/10 rounded-2xl p-5 mb-6 border border-white/10">
          <label className="block mb-2 font-semibold">
            Appointment Interval
          </label>

          <select
            value={interval}
            onChange={(e) =>
              setInterval(
                Number(e.target.value)
              )
            }
            className="w-full p-3 rounded-xl bg-black/40 border border-white/10"
          >
            <option value={15}>
              15 Minutes
            </option>

            <option value={30}>
              30 Minutes
            </option>

            <option value={60}>
              1 Hour
            </option>
          </select>
        </div>

        {/* DURATION */}
        <div className="bg-white/10 rounded-2xl p-5 mb-6 border border-white/10">
          <label className="block mb-3 font-semibold">
            Schedule Duration
          </label>

          <div className="grid grid-cols-3 gap-3">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() =>
                  setDuration(d)
                }
                className={`p-4 rounded-xl border transition ${
                  duration === d
                    ? "bg-green-600 border-green-500"
                    : "bg-black/30 border-white/10 hover:bg-white/10"
                }`}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* DAYS */}
        <div className="bg-white/10 rounded-2xl p-5 mb-6 border border-white/10">
          <label className="block mb-3 font-semibold">
            Select Days
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {DAYS.map((day) => {
              const active =
                selectedDays.includes(day);

              return (
                <button
                  key={day}
                  onClick={() =>
                    toggleDay(day)
                  }
                  className={`p-3 rounded-xl border text-sm font-medium transition ${
                    active
                      ? "bg-blue-600 border-blue-500"
                      : "bg-black/30 border-white/10 hover:bg-white/10"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* TIME BLOCKS */}
        <div className="bg-white/10 rounded-2xl p-5 border border-white/10 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-lg">
              Time Blocks
            </h2>

            <button
              onClick={addBlock}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-xl text-sm font-medium"
            >
              + Add Block
            </button>
          </div>

          <div className="space-y-5">
            {blocks.map((block, index) => (
              <div
                key={index}
                className="bg-black/30 rounded-2xl p-4 border border-white/10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">
                    Block {index + 1}
                  </h3>

                  {blocks.length > 1 && (
                    <button
                      onClick={() =>
                        removeBlock(
                          index
                        )
                      }
                      className="text-red-400 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* START */}
                  <div>
                    <label className="block text-sm mb-2 text-gray-300">
                      Start Time
                    </label>

                    <input
                      type="time"
                      value={block.start}
                      onChange={(e) =>
                        handleBlockChange(
                          index,
                          "start",
                          e.target.value
                        )
                      }
                      className="w-full p-3 rounded-xl bg-black/40 border border-white/10"
                    />
                  </div>

                  {/* END */}
                  <div>
                    <label className="block text-sm mb-2 text-gray-300">
                      End Time
                    </label>

                    <input
                      type="time"
                      value={block.end}
                      onChange={(e) =>
                        handleBlockChange(
                          index,
                          "end",
                          e.target.value
                        )
                      }
                      className="w-full p-3 rounded-xl bg-black/40 border border-white/10"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SUMMARY */}
        <div className="bg-gradient-to-r from-blue-600/30 to-green-600/30 border border-white/10 rounded-2xl p-5 mb-6">
          <h2 className="font-semibold text-lg mb-3">
            Schedule Preview
          </h2>

          <div className="space-y-2 text-sm text-gray-200">
            <p>
              <span className="font-semibold">
                Duration:
              </span>{" "}
              {duration} days
            </p>

            <p>
              <span className="font-semibold">
                Interval:
              </span>{" "}
              {interval} minutes
            </p>

            <p>
              <span className="font-semibold">
                Active Days:
              </span>{" "}
              {selectedDays.length > 0
                ? selectedDays.join(", ")
                : "None selected"}
            </p>

            <p>
              <span className="font-semibold">
                Time Blocks:
              </span>{" "}
              {blocks.length}
            </p>
          </div>
        </div>

        {/* SUBMIT */}
        <button
          onClick={handleSubmit}
          className="w-full bg-green-600 hover:bg-green-700 transition py-4 rounded-2xl font-bold text-lg"
        >
          Create Recurring Schedule
        </button>
      </div>
    </div>
  );
}