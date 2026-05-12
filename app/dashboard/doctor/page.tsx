"use client";

import Nav from "@/app/components/nav";
import { useSelector } from "react-redux";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  UserRound,
  ShieldCheck,
  Stethoscope,
  BellRing,
  Clock3,
  MessageCircleMore,
} from "lucide-react";

export default function DoctorDashboard() {
  const { logged, me, isInitialized, profileComplete } =
    useSelector((state: any) => state.mainState) || {};

  if (!isInitialized) return null;

  return (
    <div
      className="min-h-screen bg-cover bg-center"
      style={{
        backgroundImage:
          "linear-gradient(rgba(5,15,30,0.88), rgba(5,15,30,0.95)), url('/bg.jpeg')",
      }}
    >
      <Nav />

      <div className="pt-24 pb-10 px-4 flex justify-center">
        <div className="max-w-7xl w-full text-white">
          {/* HERO */}
          <div className="mb-10">
            <div className="bg-white/10 border border-white/10 backdrop-blur-md rounded-3xl p-8 md:p-10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/20 text-green-300 px-4 py-2 rounded-full text-sm mb-5">
                    <Stethoscope size={16} />
                    Doctor Dashboard
                  </div>

                  <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
                    Welcome Back{" "}
                    <span className="text-green-400">
                      {me?.title ? me.title + " " : ""}
                      {me?.first_name}
                    </span>
                  </h1>

                  <p className="text-gray-300 text-lg max-w-2xl leading-relaxed">
                    Manage appointments, schedules, patient interactions and
                    WhatsApp communication from your healthcare dashboard.
                  </p>
                </div>

                <div className="bg-black/20 border border-white/10 rounded-3xl p-6 min-w-[280px]">
                  <div className="flex items-center gap-3 mb-5">
                    <UserRound className="text-green-400" size={24} />

                    <h2 className="font-semibold text-xl">Profile Status</h2>
                  </div>

                  <div className="space-y-3 text-gray-300">
                    <p>Email: {me?.email}</p>

                    <p>Phone: {me?.phone || "Not set"}</p>

                    <p>Role: {me?.role}</p>

                    <div
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm mt-3 ${
                        profileComplete
                          ? "bg-green-500/20 text-green-300 border border-green-500/20"
                          : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/20"
                      }`}
                    >
                      <ShieldCheck size={16} />

                      {profileComplete
                        ? "Profile Complete"
                        : "Profile Incomplete"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* NOT LOGGED */}
          {!logged && (
            <div className="text-center py-24">
              <h2 className="text-3xl font-bold mb-5">Please Login</h2>

              <p className="text-gray-300 mb-8">
                Login to access your doctor dashboard and appointments.
              </p>

              <Link href="/auth/login">
                <button className="bg-green-600 hover:bg-green-700 px-8 py-4 rounded-2xl font-semibold transition">
                  Login
                </button>
              </Link>
            </div>
          )}

          {/* PROFILE INCOMPLETE */}
          {logged && !profileComplete && (
            <div className="bg-white/10 border border-white/10 backdrop-blur-md p-10 rounded-3xl text-center max-w-3xl mx-auto">
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                <BellRing className="text-yellow-400" size={38} />
              </div>

              <h2 className="text-3xl font-bold mb-5">Complete Your Profile</h2>

              <p className="text-gray-300 mb-8 text-lg leading-relaxed">
                Complete your professional doctor profile to start managing
                schedules, appointments and patient communication.
              </p>

              <Link href="/doctor/update-profile">
                <button className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-4 rounded-2xl font-bold transition">
                  Complete Profile
                </button>
              </Link>
            </div>
          )}

          {/* MAIN DASHBOARD */}
          {logged && profileComplete && (
            <>
              {/* QUICK ACTIONS */}
              <div className="mb-10">
                <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>

                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
                  <DashboardCard
                    title="Manage Schedule"
                    desc="Set availability and manage consultation slots."
                    link="/doctor/schedule/view"
                    color="bg-green-600"
                    icon={<Clock3 size={30} />}
                  />

                  <DashboardCard
                    title="Appointments"
                    desc="View and manage patient appointments."
                    link="/doctor/appointments"
                    color="bg-blue-600"
                    icon={<ClipboardCheck size={30} />}
                  />

                  <DashboardCard
                    title="Update Profile"
                    desc="Manage and update your doctor profile."
                    link="/doctor/update-profile"
                    color="bg-purple-600"
                    icon={<UserRound size={30} />}
                  />

                  <DashboardCard
                    title="Connect WhatsApp"
                    desc="Connect Meta WhatsApp or MessageBird integration."
                    link="/doctor/whatsapp/signup"
                    color="bg-emerald-600"
                    icon={<MessageCircleMore size={30} />}
                  />
                </div>
              </div>

              {/* SUMMARY */}
              <div className="bg-white/10 border border-white/10 backdrop-blur-md rounded-3xl p-8">
                <h2 className="text-2xl font-bold mb-6">Account Summary</h2>

                <div className="grid md:grid-cols-2 gap-6 text-gray-300">
                  <div className="bg-black/20 rounded-2xl p-5 border border-white/10">
                    <h3 className="font-semibold text-white mb-3">
                      Professional Information
                    </h3>

                    <div className="space-y-2">
                      <p>
                        Name: {me?.title ? me.title + " " : ""}
                        {me?.first_name} {me?.last_name}
                      </p>

                      <p>Email: {me?.email}</p>

                      <p>Phone: {me?.phone || "Not set"}</p>
                    </div>
                  </div>

                  <div className="bg-black/20 rounded-2xl p-5 border border-white/10">
                    <h3 className="font-semibold text-white mb-3">
                      Account Status
                    </h3>

                    <div className="space-y-2">
                      <p>Role: {me?.role}</p>

                      <p>Dashboard: Doctor</p>

                      <p className="text-green-400">Active Account</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * DASHBOARD CARD
 */

function DashboardCard({
  title,
  desc,
  link,
  color,
  icon,
}: {
  title: string;
  desc: string;
  link: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={link}>
      <div className="bg-white/10 border border-white/10 backdrop-blur-md rounded-3xl p-7 hover:scale-[1.02] transition duration-300 cursor-pointer h-full">
        <div
          className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center mb-5`}
        >
          {icon}
        </div>

        <h3 className="text-2xl font-bold mb-3">{title}</h3>

        <p className="text-gray-300 leading-relaxed mb-6">{desc}</p>

        <button
          className={`${color} px-5 py-3 rounded-xl font-semibold hover:opacity-90 transition`}
        >
          Open
        </button>
      </div>
    </Link>
  );
}
