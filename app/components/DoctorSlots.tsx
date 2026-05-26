"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";

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

  specialty?: string;

  experience?: number;

  bio?: string;

  phone?: string;
}

/**
 * =========================================
 * DOCTOR SLOTS
 * =========================================
 */

export default function DoctorSlots({ doctorId }: { doctorId: string }) {
  /**
   * =====================================
   * REDUX USER
   * =====================================
   */

  const { me } = useSelector((state: any) => state.mainState) || {};

  /**
   * =====================================
   * STATES
   * =====================================
   */

  const [slots, setSlots] = useState<Slot[]>([]);

  const [doctor, setDoctor] = useState<Doctor | null>(null);

  const [date, setDate] = useState("");

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [reason, setReason] = useState("");

  /**
   * =====================================
   * FETCH SLOTS
   * =====================================
   */

  const fetchSlots = async () => {
    try {
      setLoading(true);

      const res = await axios.get(`/api/doctor/${doctorId}/slots`, {
        params: {
          page,

          date,
        },
      });

      console.log("DOCTOR SLOTS RESPONSE", res.data);

      setSlots(res.data.slots || []);

      setDoctor(res.data.doctor || null);

      setTotalPages(res.data.pagination?.total_pages || 0);

      setMessage(res.data.message || null);
    } catch (err) {
      console.error(err);

      setSlots([]);

      toast.error("Failed to load slots");
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
    if (doctorId) {
      fetchSlots();
    }
  }, [doctorId, date, page]);

  /**
   * =====================================
   * FORMAT DATE
   * =====================================
   */

  const formatDate = (slot?: Slot | null) => {
    if (!slot?.start_date) {
      return "Unknown date";
    }

    return new Date(slot.start_date).toLocaleDateString([], {
      weekday: "long",

      year: "numeric",

      month: "long",

      day: "numeric",
    });
  };

  /**
   * =====================================
   * FORMAT TIME
   * =====================================
   */

  const formatTime = (slot?: Slot | null) => {
    if (!slot?.start_date || !slot?.end_date) {
      return "Invalid time";
    }

    const start = new Date(slot.start_date);

    const end = new Date(slot.end_date);

    return `${start.toLocaleTimeString([], {
      hour: "2-digit",

      minute: "2-digit",
    })} - ${end.toLocaleTimeString([], {
      hour: "2-digit",

      minute: "2-digit",
    })}`;
  };

  /**
   * =====================================
   * SLOT INTERVAL
   * =====================================
   */

  const getInterval = (slot?: Slot | null) => {
    if (!slot?.start_date || !slot?.end_date) {
      return 0;
    }

    const start = new Date(slot.start_date);

    const end = new Date(slot.end_date);

    return (end.getTime() - start.getTime()) / (1000 * 60);
  };

  /**
   * =====================================
   * BOOK SLOT
   * =====================================
   */

  const handleBooking = async () => {
    /**
     * NO SLOT
     */

    if (!selectedSlot) {
      toast.error("Please select a slot");

      return;
    }

    /**
     * INVALID REASON
     */

    if (!reason || reason.length < 5) {
      toast.error("Enter a valid appointment reason");

      return;
    }

    try {
      /**
       * TOKEN
       */

      const token = Cookies.get("access_token");

      if (!token) {
        toast.error("Unauthorized");

        return;
      }

      /**
       * LOADING
       */

      const loadingToast = toast.loading("Booking appointment...");

      /**
       * BOOK APPOINTMENT
       */

      const bookingRes = await axios.post(
        "/api/patient/appointments/book",
        {
          slot_id: selectedSlot.id,

          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      /**
       * SUCCESS
       */

      toast.success(bookingRes.data?.message || "Appointment booked 🎉", {
        id: loadingToast,
      });

      /**
       * FETCH PROVIDER
       */

      let provider = "MESSAGE_BIRD";

      try {
        const providerRes = await axios.get("/api/whatsapp/provider");

        provider = providerRes.data?.provider || "MESSAGE_BIRD";
      } catch (err) {
        console.error("PROVIDER FETCH FAILED", err);
      }

      /**
       * ENDPOINT
       */

      const sendEndpoint =
        provider === "META_WHATSAPP"
          ? "/api/whatsapp/meta/send"
          : "/api/whatsapp/messagebird/send";

      /**
       * SEND NOTIFICATION
       */

      const notifyToast = toast.loading("Informing doctor on WhatsApp...");

      try {
        /**
         * DATE + TIME
         */

        const appointmentDate = formatDate(selectedSlot);

        const appointmentTime = formatTime(selectedSlot);

        /**
         * PATIENT NAME
         */

        const patientName = me?.title
          ? `${me.title} ${me.first_name} ${me.last_name}`
          : `${me?.first_name || ""} ${me?.last_name || ""}`.trim();

        /**
         * HOSPITAL
         */

        const hospitalName = "Health Care";

        /**
         * META
         */

        if (provider === "META_WHATSAPP") {
          await axios.post(
            sendEndpoint,
            {
              test: true,

              simulate_failure: false,

              sendby: "HOST",

              to: doctor?.phone || "+2348000000000",

              template_name: "appointment_booking",

              template_variables: {
                doctor_name: doctor?.name || "Doctor",

                patient_name: patientName,

                hospital_name: hospitalName,

                patient_reason: reason,

                appointment_date: appointmentDate,

                appointment_time: appointmentTime,
              },
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
        } else {
          /**
           * MESSAGEBIRD
           */

          await axios.post(
            sendEndpoint,
            {
              test: true,

              simulate_failure: false,

              sendby: "HOST",

              to: doctor?.phone || "+2348000000000",

              message: `🏥 ${hospitalName}

Hello ${doctor?.name || "Doctor"},

You have a new appointment booking.

👤 Patient:
${patientName}

📝 Reason:
${reason}

📅 Date:
${appointmentDate}

⏰ Time:
${appointmentTime}

Please check your dashboard for more details.`,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
        }

        /**
         * SUCCESS
         */

        toast.success(
          `Doctor notified successfully via ${
            provider === "META_WHATSAPP" ? "Meta WhatsApp" : "MessageBird"
          }`,
          {
            id: notifyToast,
          },
        );
      } catch (err: any) {
        console.error("WHATSAPP SEND ERROR", err);

        toast.error(
          err?.response?.data?.message ||
            "Appointment booked but WhatsApp notification failed",
          {
            id: notifyToast,
          },
        );
      }

      /**
       * RESET
       */

      setSelectedSlot(null);

      setReason("");

      /**
       * REFRESH
       */

      fetchSlots();
    } catch (err: any) {
      console.error("BOOKING ERROR", err);

      toast.error(err?.response?.data?.message || "Booking failed");
    }
  };

  /**
   * =====================================
   * NO DOCTOR
   * =====================================
   */

  if (!doctorId) {
    return null;
  }

  /**
   * =====================================
   * UI
   * =====================================
   */

  return (
    <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl text-white border border-white/10">
      {/* DOCTOR */}

      {doctor && (
        <div className="mb-8">
          <h2 className="text-3xl font-bold">{doctor.name}</h2>

          <p className="text-gray-300 mt-1">
            {doctor.specialty || "General"} • {doctor.experience || 0} years
            experience
          </p>

          {doctor.bio && (
            <p className="text-gray-400 mt-3 text-sm">{doctor.bio}</p>
          )}
        </div>
      )}

      {/* FILTER */}

      <div className="flex gap-3 mb-6 flex-wrap">
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
        <div className="mb-6 bg-yellow-500/20 border border-yellow-400 text-yellow-100 p-4 rounded-xl">
          {message}
        </div>
      )}

      {/* LOADING */}

      {loading && <p className="text-gray-300">Loading slots...</p>}

      {/* EMPTY */}

      {!loading && slots.length === 0 && (
        <div className="text-center bg-white/10 p-6 rounded-xl">
          No available slots for this doctor.
        </div>
      )}

      {/* SLOTS */}

      {slots.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {slots.map((slot) => (
              <div
                key={slot.id}
                onClick={() => setSelectedSlot(slot)}
                className={`p-5 rounded-2xl cursor-pointer border transition ${
                  selectedSlot?.id === slot.id
                    ? "bg-green-600 border-green-400"
                    : "bg-white/10 border-white/10 hover:bg-white/20"
                }`}
              >
                {/* DATE */}

                <p className="text-sm text-gray-300 mb-2">{formatDate(slot)}</p>

                {/* TIME */}

                <p className="font-semibold text-lg">{formatTime(slot)}</p>

                {/* INTERVAL */}

                <p className="text-sm text-gray-300 mt-2">
                  {getInterval(slot)} mins
                </p>

                {/* RAW KEY */}

                <p className="text-[10px] opacity-60 mt-3 break-all">
                  {slot.start_time}
                </p>
              </div>
            ))}
          </div>

          {/* PAGINATION */}

          <div className="flex justify-center mt-8 gap-4 items-center">
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
        </>
      )}

      {/* BOOK FORM */}

      {selectedSlot && (
        <div className="mt-10 bg-white/10 p-5 rounded-2xl border border-white/10">
          <h3 className="font-bold text-xl mb-3">Book Selected Slot</h3>

          <div className="mb-4 text-sm text-gray-300">
            <p>
              <strong>Date:</strong> {formatDate(selectedSlot)}
            </p>

            <p>
              <strong>Time:</strong> {formatTime(selectedSlot)}
            </p>
          </div>

          <textarea
            className="w-full p-4 rounded-xl bg-white text-black mb-4 min-h-[120px]"
            placeholder="Enter reason for appointment..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <button
            onClick={handleBooking}
            className="w-full bg-green-600 hover:bg-green-700 transition py-4 rounded-xl font-bold"
          >
            Confirm Booking
          </button>
        </div>
      )}
    </div>
  );
}
