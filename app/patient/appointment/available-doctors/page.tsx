"use client";

import Nav from "@/app/components/nav";
import DoctorSlots from "@/app/components/DoctorSlots";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

/**
 * =========================================
 * SLOT TYPE
 * =========================================
 */

interface Slot {
  id: string;

  doctor_id: string;

  start_time: string;

  end_time: string;

  start_date?: string;

  end_date?: string;

  is_booked: boolean;
}

/**
 * =========================================
 * DOCTOR TYPE
 * =========================================
 */

interface Doctor {
  doctor_id: string;

  name: string;

  specialty: string | null;

  experience: number | null;

  preview_slots: {
    first: Slot[];

    last: Slot[];
  };
}

/**
 * =========================================
 * BOOK DOCTOR PAGE
 * =========================================
 */

export default function BookDoctorPage() {
  /**
   * =====================================
   * STATES
   * =====================================
   */

  const [doctors, setDoctors] = useState<Doctor[]>([]);

  const [date, setDate] = useState("");

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);

  /**
   * =====================================
   * FETCH DOCTORS
   * =====================================
   */

  const fetchDoctors = async () => {
    try {
      setLoading(true);

      const res = await axios.get("/api/doctor/available", {
        params: {
          page,

          date,
        },
      });

      console.log("AVAILABLE DOCTORS", res.data);

      setDoctors(res.data.doctors || []);

      setTotalPages(res.data.pagination?.total_pages || 0);

      setMessage(res.data.message || null);
    } catch (err) {
      console.error(err);

      setDoctors([]);

      setMessage("Failed to load doctors");

      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  /**
   * =====================================
   * LOAD
   * =====================================
   */

  useEffect(() => {
    fetchDoctors();
  }, [date, page]);

  /**
   * =====================================
   * FORMAT SLOT TIME
   * =====================================
   */

  const formatSlotTime = (slot?: Slot | null) => {
    if (!slot?.start_date) {
      return "Invalid time";
    }

    return new Date(slot.start_date).toLocaleTimeString([], {
      hour: "2-digit",

      minute: "2-digit",
    });
  };

  /**
   * =====================================
   * FORMAT SLOT DATE
   * =====================================
   */

  const formatSlotDate = (slot?: Slot | null) => {
    if (!slot?.start_date) {
      return "";
    }

    return new Date(slot.start_date).toLocaleDateString();
  };

  /**
   * =====================================
   * RENDER
   * =====================================
   */

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,15,30,0.9), rgba(5,15,30,0.9)), url('/bg.jpeg')",
      }}
    >
      <Nav />

      <div className="pt-24 max-w-6xl mx-auto text-white px-4 pb-20">
        {/* TITLE */}

        <h1 className="text-3xl font-bold mb-6 text-center">
          Book an Appointment
        </h1>

        {/* DOCTOR SLOTS */}

        {selectedDoctorId ? (
          <>
            <div className="mb-6 text-center">
              <button
                onClick={() => setSelectedDoctorId(null)}
                className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 transition"
              >
                ← Back to Doctors
              </button>
            </div>

            <DoctorSlots doctorId={selectedDoctorId} />
          </>
        ) : (
          <>
            {/* FILTER */}

            <div className="flex justify-center gap-3 mb-6 flex-wrap">
              <input
                type="date"
                className="p-3 rounded-lg bg-white/20 border border-white/10"
                value={date}
                onChange={(e) => {
                  setPage(1);

                  setDate(e.target.value);
                }}
              />

              <button
                onClick={() => {
                  setDate("");

                  setPage(1);
                }}
                className="bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 transition"
              >
                Reset
              </button>
            </div>

            {/* MESSAGE */}

            {message && (
              <div className="mb-6 text-center bg-yellow-500/20 border border-yellow-400 text-yellow-100 p-4 rounded-xl">
                {message}
              </div>
            )}

            {/* LOADING */}

            {loading && (
              <p className="text-center text-gray-300">Loading doctors...</p>
            )}

            {/* EMPTY */}

            {!loading && doctors.length === 0 && (
              <div className="text-center bg-white/10 p-8 rounded-2xl border border-white/10">
                <h2 className="text-xl mb-2">No doctors available</h2>

                <p className="text-gray-300">
                  {message || "Try another date or check again later."}
                </p>
              </div>
            )}

            {/* DOCTORS */}

            {doctors.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                {doctors.map((doctor) => (
                  <div
                    key={doctor.doctor_id}
                    onClick={() => setSelectedDoctorId(doctor.doctor_id)}
                    className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl cursor-pointer border border-white/10 hover:border-green-500 hover:scale-[1.01] transition"
                  >
                    {/* NAME */}

                    <h2 className="text-xl font-semibold mb-2">
                      {doctor.name}
                    </h2>

                    {/* DETAILS */}

                    <p className="text-gray-300 text-sm">
                      {doctor.specialty || "General"} • {doctor.experience || 0}{" "}
                      yrs experience
                    </p>

                    {/* FIRST SLOT DATE */}

                    {doctor.preview_slots.first?.[0] && (
                      <div className="mt-3 text-sm text-green-300">
                        Available from{" "}
                        {formatSlotDate(doctor.preview_slots.first[0])}
                      </div>
                    )}

                    {/* EARLY SLOTS */}

                    <div className="mt-5">
                      <p className="text-sm text-gray-400 mb-2">Early Slots</p>

                      <div className="flex gap-2 flex-wrap">
                        {doctor.preview_slots.first.map(
                          (slot: Slot, index: number) => (
                            <div
                              key={index}
                              className="bg-green-600/90 px-3 py-2 rounded-lg text-xs"
                            >
                              <div>{formatSlotTime(slot)}</div>

                              <div className="opacity-70 text-[10px] mt-1">
                                {slot.start_time}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {/* LATE SLOTS */}

                    <div className="mt-5">
                      <p className="text-sm text-gray-400 mb-2">Later Slots</p>

                      <div className="flex gap-2 flex-wrap">
                        {doctor.preview_slots.last.map(
                          (slot: Slot, index: number) => (
                            <div
                              key={index}
                              className="bg-blue-600/90 px-3 py-2 rounded-lg text-xs"
                            >
                              <div>{formatSlotTime(slot)}</div>

                              <div className="opacity-70 text-[10px] mt-1">
                                {slot.start_time}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    {/* CTA */}

                    <div className="mt-6">
                      <button className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-gray-200 transition">
                        View Available Slots
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION */}

            {doctors.length > 0 && (
              <div className="flex justify-center items-center mt-10 gap-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="bg-gray-700 px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Prev
                </button>

                <span className="text-sm text-gray-300">
                  Page {page} / {totalPages || 1}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="bg-gray-700 px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
