"use client";

import Nav from "@/app/components/nav";
import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

/**
 * =========================================
 * SLOT TYPE
 * =========================================
 */

interface Slot {
  id: string;

  start_time: string;

  end_time: string;

  start_date?: string;

  end_date?: string;

  is_booked: boolean;
}

/**
 * =========================================
 * APPOINTMENT TYPE
 * =========================================
 */

interface Appointment {
  id: string;

  reason: string;

  status: string;

  created_at: string;

  doctor: string;

  doctor_id?: string;

  slot: Slot | null;
}

/**
 * =========================================
 * PAGE
 * =========================================
 */

export default function PatientAppointments() {
  const router = useRouter();

  /**
   * =====================================
   * STATES
   * =====================================
   */

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);

  /**
   * =====================================
   * FETCH APPOINTMENTS
   * =====================================
   */

  const fetchAppointments = async () => {
    try {
      setLoading(true);

      const token = Cookies.get("access_token");

      const res = await axios.get("/api/patient/appointments/my", {
        params: {
          page,
        },

        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("PATIENT APPOINTMENTS", res.data);

      setAppointments(res.data.appointments || []);

      setTotalPages(res.data.pagination?.total_pages || 0);
    } catch (err) {
      console.error(err);

      setAppointments([]);
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
    fetchAppointments();
  }, [page]);

  /**
   * =====================================
   * CANCEL
   * =====================================
   */

  const handleCancel = async (appointmentId: string) => {
    try {
      const token = Cookies.get("access_token");

      const loadingToast = toast.loading("Cancelling...");

      await axios.patch(
        "/api/patient/appointments/cancel",
        {
          appointment_id: appointmentId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Appointment cancelled", {
        id: loadingToast,
      });

      fetchAppointments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Cancel failed");
    }
  };

  /**
   * =====================================
   * RESCHEDULE
   * =====================================
   */

  const handleReschedule = async (appointment: Appointment) => {
    try {
      /**
       * We now redirect directly
       * because backend handles
       * proper conversational
       * reschedule flow.
       */

      router.push(
        `/patient/appointment/available-doctors?doctorId=${appointment.doctor_id}`,
      );
    } catch (err) {
      console.error(err);

      toast.error("Failed to start reschedule");
    }
  };

  /**
   * =====================================
   * FORMAT STATUS
   * =====================================
   */

  const formatStatus = (status: string) => {
    return status.replaceAll("_", " ").toLowerCase();
  };

  /**
   * =====================================
   * STATUS COLOR
   * =====================================
   */

  const getStatusColor = (status: string) => {
    if (status === "PENDING") {
      return "bg-yellow-500";
    }

    if (status === "CONFIRMED") {
      return "bg-green-600";
    }

    if (status === "CANCELLED_BY_PATIENT" || status === "CANCELLED_BY_DOCTOR") {
      return "bg-red-600";
    }

    return "bg-gray-500";
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

      <div className="pt-24 max-w-4xl mx-auto text-white px-4 pb-20">
        {/* TITLE */}

        <h1 className="text-3xl font-bold mb-6 text-center">My Appointments</h1>

        {/* LOADING */}

        {loading && (
          <p className="text-center text-gray-300">Loading appointments...</p>
        )}

        {/* EMPTY */}

        {!loading && appointments.length === 0 && (
          <div className="bg-white/10 p-6 rounded-xl text-center">
            <h2 className="text-xl mb-2">No appointments yet</h2>

            <p className="text-gray-300">
              You haven’t booked any appointments.
            </p>
          </div>
        )}

        {/* LIST */}

        {appointments.length > 0 && (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              /**
               * FRONTEND DATE OBJECTS
               */

              const start = appointment.slot?.start_date
                ? new Date(appointment.slot.start_date)
                : null;

              const end = appointment.slot?.end_date
                ? new Date(appointment.slot.end_date)
                : null;

              /**
               * CANCELLED
               */

              const isCancelled =
                appointment.status === "CANCELLED_BY_PATIENT" ||
                appointment.status === "CANCELLED_BY_DOCTOR";

              return (
                <div
                  key={appointment.id}
                  className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10"
                >
                  {/* DOCTOR */}

                  <h2 className="text-lg font-semibold">
                    {appointment.doctor || "Doctor"}
                  </h2>

                  {/* TIME */}

                  {start && end && (
                    <div className="mt-2 text-sm text-gray-300 space-y-1">
                      <p>
                        <span className="font-medium text-white">Date:</span>{" "}
                        {start.toLocaleDateString()}
                      </p>

                      <p>
                        <span className="font-medium text-white">Time:</span>{" "}
                        {start.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {end.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  )}

                  {/* RAW SLOT STRING */}

                  {appointment.slot && (
                    <div className="mt-2 text-xs text-gray-400">
                      Slot Key: {appointment.slot.start_time}
                    </div>
                  )}

                  {/* REASON */}

                  <div className="mt-4">
                    <p className="text-sm text-gray-400">Reason</p>

                    <p className="text-gray-100">{appointment.reason}</p>
                  </div>

                  {/* STATUS */}

                  <div className="mt-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${getStatusColor(
                        appointment.status,
                      )}`}
                    >
                      {formatStatus(appointment.status)}
                    </span>
                  </div>

                  {/* CREATED */}

                  <div className="mt-3 text-xs text-gray-400">
                    Created: {new Date(appointment.created_at).toLocaleString()}
                  </div>

                  {/* ACTIONS */}

                  {!isCancelled && (
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        onClick={() => handleCancel(appointment.id)}
                        className="bg-red-600 hover:bg-red-700 transition px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={() => handleReschedule(appointment)}
                        className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 rounded-lg text-sm font-medium"
                      >
                        Reschedule
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* PAGINATION */}

        {appointments.length > 0 && (
          <div className="flex justify-center items-center mt-8 gap-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded disabled:opacity-50"
            >
              Prev
            </button>

            <span className="text-sm text-gray-300">
              Page {page} / {totalPages || 1}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
