"use client";

import Nav from "@/app/components/nav";
import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function AddSchedule() {
  const router = useRouter();

  const [interval, setInterval] = useState(30);
  const [blocks, setBlocks] = useState([{ start: "", end: "" }]);

  const addBlock = () => {
    setBlocks([...blocks, { start: "", end: "" }]);
  };

  const removeBlock = (index: number) => {
    const updated = blocks.filter((_, i) => i !== index);
    setBlocks(updated.length ? updated : [{ start: "", end: "" }]);
  };

  const handleChange = (
    i: number,
    field: "start" | "end",
    value: string
  ) => {
    const updated = [...blocks];
    updated[i][field] = value;
    setBlocks(updated);
  };

  const handleSubmit = async () => {
    try {
      const token = Cookies.get("access_token");

      if (!token) {
        toast.error("Please login again");
        return;
      }

      const loading = toast.loading("Creating schedule...");

      const res = await axios.post(
        "/api/doctor/schedule/add-non-recurring",
        {
          interval,
          blocks,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(res.data.message || "Schedule created 🎉", {
        id: loading,
      });

      router.push("/doctor/schedule/view");
    } catch (err: any) {
      toast.dismiss();

      toast.error(
        err?.response?.data?.message ||
          "Failed to create schedule"
      );
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,15,30,0.9), rgba(5,15,30,0.9)), url('/bg.jpeg')",
      }}
    >
      <Nav />

      <div className="pt-24 max-w-xl mx-auto text-white px-4">
        <h1 className="text-2xl font-bold mb-4">
          Add Schedule
        </h1>

        {/* GUIDE */}
        <div className="bg-white/10 p-4 rounded mb-6 text-sm text-gray-300">
          <p className="font-semibold text-white mb-2">
            How scheduling works:
          </p>

          <ul className="list-disc pl-5 space-y-2">
            <li>
              Choose how long each appointment should last
              (15, 30, or 60 minutes)
            </li>

            <li>
              Add one or more availability blocks (e.g. 9:00am
              → 12:00pm)
            </li>

            <li>
              Your schedule must start from{" "}
              <span className="text-white font-semibold">
                tomorrow (00:00)
              </span>{" "}
              and within the next{" "}
              <span className="text-white font-semibold">
                72 hours
              </span>
            </li>

            <li>
              If a Sunday falls within that range, the system
              extends the window to{" "}
              <span className="text-white font-semibold">
                96 hours
              </span>{" "}
              automatically
            </li>

            <li className="text-red-400">
              Sundays are NOT allowed — any Sunday slots will
              be skipped
            </li>

            <li>
              If all your selected times fall on Sunday, your
              schedule will be rejected
            </li>

            <li>
              You can add multiple blocks to create breaks
              between sessions
            </li>
          </ul>
        </div>

        {/* INTERVAL */}
        <label className="block mb-1 text-sm">
          Select Interval
        </label>
        <select
          className="w-full mb-6 p-3 rounded bg-white/20 text-black"
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
        >
          <option value={15}>15 mins</option>
          <option value={30}>30 mins</option>
          <option value={60}>1 hour</option>
        </select>

        {/* BLOCKS */}
        {blocks.map((b, i) => (
          <div
            key={i}
            className="mb-6 bg-white/10 p-4 rounded relative"
          >
            <p className="mb-2 font-semibold">
              Block {i + 1}
            </p>

            {/* REMOVE BUTTON */}
            {blocks.length > 1 && (
              <button
                onClick={() => removeBlock(i)}
                className="absolute top-2 right-2 text-red-400 text-sm"
              >
                ✕
              </button>
            )}

            {/* START */}
            <label className="block text-sm mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              className="w-full mb-3 p-3 rounded bg-white/20 border border-white/20"
              value={b.start}
              onChange={(e) =>
                handleChange(i, "start", e.target.value)
              }
            />

            {/* END */}
            <label className="block text-sm mb-1">
              End Time
            </label>
            <input
              type="datetime-local"
              className="w-full p-3 rounded bg-white/20 border border-white/20"
              value={b.end}
              onChange={(e) =>
                handleChange(i, "end", e.target.value)
              }
            />
          </div>
        ))}

        {/* ADD BLOCK */}
        <button
          onClick={addBlock}
          className="mb-4 bg-gray-600 px-4 py-2 rounded"
        >
          + Add Another Time Block
        </button>

        {/* SUBMIT */}
        <button
          onClick={handleSubmit}
          className="w-full bg-green-600 py-3 rounded font-bold hover:scale-[1.02] transition"
        >
          Save Schedule
        </button>
      </div>
    </div>
  );
}