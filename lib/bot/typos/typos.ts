/**
 * =========================================
 * TYPO NORMALIZATION
 * =========================================
 *
 * Handles:
 * - bok -> book
 * - appointmnt -> appointment
 * - tmrw -> tomorrow
 * - drs -> dr
 * =========================================
 */

export const TYPO_MAP: Record<string, string> = {
  bok: "book",

  appointmnt: "appointment",

  appointmet: "appointment",

  apointment: "appointment",

  tmrw: "tomorrow",

  tomorow: "tomorrow",

  drs: "dr",

  doc: "doctor",

  avilable: "available",

  availble: "available",

  cncel: "cancel",

  cancell: "cancel",
};
