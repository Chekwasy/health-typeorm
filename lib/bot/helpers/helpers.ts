import dbClient from "@/lib/db";

import { Appointment } from "@/entities/Appointment";

import { DoctorSlot } from "@/entities/DoctorSlot";

/**
 * =========================================
 * VALIDATE FUTURE DATE
 * =========================================
 */

export function isPastDate(date: Date) {
  return new Date(date) < new Date();
}
