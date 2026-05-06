"use client";

import Nav from "@/app/components/nav";
import DoctorSlots from "@/app/components/DoctorSlots";
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

export default function BookDoctorPage() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);

  // NEW
  const [message, setMessage] = useState<string | null>(null);

  const [selectedDoctorId, setSelectedDoctorId] =
    useState<string | null>(null);

  const fetchDoctors = async () => {
    try {
      setLoading(true);

      const res = await axios.get("/api/doctor/available", {
        params: {
          page,
          date,
        },
      });

      setDoctors(res.data.doctors || []);
      setTotalPages(res.data.pagination?.total_pages || 0);

      // NEW: capture backend message
      setMessage(res.data.message || null);
      toast.success(res.data.message || "Doctors loaded");
    } catch (err) {
      console.error(err);
      setDoctors([]);
      setMessage("Failed to load doctors");
      toast.error("Failed to load doctors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [date, page]);

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,15,30,0.9), rgba(5,15,30,0.9)), url('/bg.jpeg')",
      }}
    >
      <Nav />

      <div className="pt-24 max-w-6xl mx-auto text-white px-4">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Book an Appointment
        </h1>

        {selectedDoctorId ? (
          <>
            <div className="mb-6 text-center">
              <button
                onClick={() => setSelectedDoctorId(null)}
                className="bg-gray-600 px-4 py-2 rounded hover:bg-gray-700 transition"
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
                className="p-2 rounded bg-white/20"
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
                className="bg-gray-600 px-3 py-2 rounded"
              >
                Reset
              </button>
            </div>

            {/* MESSAGE FROM BACKEND */}
            {message && (
              <div className="mb-6 text-center bg-yellow-500/20 border border-yellow-400 text-yellow-200 p-3 rounded">
                {message}
              </div>
            )}

            {/* LOADING */}
            {loading && (
              <p className="text-center text-gray-300">
                Loading doctors...
              </p>
            )}

            {/* EMPTY STATE */}
            {!loading && doctors.length === 0 && (
              <div className="text-center bg-white/10 p-8 rounded">
                <h2 className="text-xl mb-2">
                  No doctors available
                </h2>

                <p className="text-gray-300">
                  {message ||
                    "Try selecting another date or check back later."}
                </p>
              </div>
            )}

            {/* DOCTORS */}
            {doctors.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                {doctors.map((doc) => (
                  <div
                    key={doc.doctor_id}
                    onClick={() =>
                      setSelectedDoctorId(doc.doctor_id)
                    }
                    className="bg-white/10 p-6 rounded-xl cursor-pointer hover:scale-[1.02] transition border border-transparent hover:border-green-500"
                  >
                    <h2 className="text-xl font-semibold mb-2">
                      {doc.name}
                    </h2>

                    <p className="text-gray-300 text-sm">
                      {doc.specialty || "General"} •{" "}
                      {doc.experience || 0} yrs experience
                    </p>

                    {/* EARLY */}
                    <div className="mt-4">
                      <p className="text-sm text-gray-400 mb-1">
                        Early Slots:
                      </p>

                      <div className="flex gap-2 flex-wrap">
                        {doc.preview_slots.first.map(
                          (slot: any, i: number) => (
                            <span
                              key={i}
                              className="bg-green-600 px-2 py-1 rounded text-xs"
                            >
                              {new Date(
                                slot.start_time
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    {/* LATE */}
                    <div className="mt-3">
                      <p className="text-sm text-gray-400 mb-1">
                        Later Slots:
                      </p>

                      <div className="flex gap-2 flex-wrap">
                        {doc.preview_slots.last.map(
                          (slot: any, i: number) => (
                            <span
                              key={i}
                              className="bg-blue-600 px-2 py-1 rounded text-xs"
                            >
                              {new Date(
                                slot.start_time
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PAGINATION */}
            {doctors.length > 0 && (
              <div className="flex justify-center mt-8 gap-4">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="bg-gray-600 px-4 py-2 rounded disabled:opacity-50"
                >
                  Prev
                </button>

                <span className="self-center">
                  Page {page} / {totalPages || 1}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="bg-gray-600 px-4 py-2 rounded disabled:opacity-50"
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