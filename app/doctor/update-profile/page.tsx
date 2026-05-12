"use client";

import Nav from "@/app/components/nav";
import { useState, FormEvent } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { Phone, Stethoscope, BadgeInfo, BriefcaseMedical } from "lucide-react";

export default function DoctorUpdateProfile() {
  const router = useRouter();

  const [specialty, setSpecialty] = useState("");

  const [bio, setBio] = useState("");

  const [years, setYears] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    /**
     * VALIDATION
     */

    if (!specialty || !bio || !years || !phoneNumber) {
      toast.error("Please fill all fields");

      return;
    }

    if (bio.length < 10) {
      toast.error("Bio is too short");

      return;
    }

    if (phoneNumber.replace(/\s+/g, "").length < 7) {
      toast.error("Invalid phone number");

      return;
    }

    try {
      const token = Cookies.get("access_token");

      if (!token) {
        toast.error("Unauthorized");

        return;
      }

      setLoading(true);

      const loadingToast = toast.loading("Updating profile...");

      await axios.patch(
        "/api/users/update/doctor",
        {
          specialty,

          bio,

          phone_number: phoneNumber,

          years_of_experience: Number(years),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Profile updated successfully 🎉", {
        id: loadingToast,
      });

      /**
       * REDIRECT
       */

      router.push("/dashboard/doctor");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,15,30,0.88), rgba(5,15,30,0.95)), url('/bg.jpeg')",
      }}
    >
      <Nav />

      <div className="pt-24 pb-10 flex justify-center px-4">
        <div className="w-full max-w-2xl bg-white/10 border border-white/10 backdrop-blur-md p-8 rounded-3xl shadow-xl text-white">
          {/* HEADER */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/20 text-green-300 px-4 py-2 rounded-full text-sm mb-5">
              <Stethoscope size={16} />
              Doctor Profile
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Complete Doctor Profile
            </h1>

            <p className="text-gray-300 leading-relaxed">
              Set up your professional information so patients can learn more
              about your healthcare services.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* SPECIALTY */}
            <div className="mb-5">
              <label className="text-sm text-gray-300 mb-2 block">
                Specialty
              </label>

              <div className="relative">
                <BriefcaseMedical
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="text"
                  placeholder="e.g. Cardiologist"
                  className="w-full pl-12 p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-green-500"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                />
              </div>
            </div>

            {/* PHONE NUMBER */}
            <div className="mb-5">
              <label className="text-sm text-gray-300 mb-2 block">
                Phone Number
              </label>

              <div className="relative">
                <Phone
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />

                <input
                  type="tel"
                  placeholder="+2348012345678"
                  className="w-full pl-12 p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-green-500"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            {/* EXPERIENCE */}
            <div className="mb-5">
              <label className="text-sm text-gray-300 mb-2 block">
                Years of Experience
              </label>

              <input
                type="number"
                placeholder="Years of experience"
                className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-green-500"
                value={years}
                onChange={(e) => setYears(e.target.value)}
              />
            </div>

            {/* BIO */}
            <div className="mb-8">
              <label className="text-sm text-gray-300 mb-2 block">
                Professional Bio
              </label>

              <div className="relative">
                <BadgeInfo
                  className="absolute left-4 top-5 text-gray-400"
                  size={18}
                />

                <textarea
                  placeholder="Tell patients about yourself, your experience and healthcare expertise..."
                  className="w-full pl-12 p-4 rounded-2xl bg-white/10 border border-white/10 outline-none focus:border-green-500"
                  rows={5}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>

            {/* BUTTON */}
            <button
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed py-4 rounded-2xl font-bold transition duration-300"
            >
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
