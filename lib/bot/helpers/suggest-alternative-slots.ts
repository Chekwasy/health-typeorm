import dbClient from "@/lib/db";

import { DoctorSlot } from "@/entities/DoctorSlot";

/**
 * =========================================
 * SUGGEST ALTERNATIVE SLOTS
 * =========================================
 */

export async function suggestAlternativeSlots({
  doctor_id,
}: {
  doctor_id: string;
}) {
  await dbClient.init();

  const slotRepo = dbClient.client.getRepository(DoctorSlot);

  /**
   * AVAILABLE FUTURE
   */

  const slots = await slotRepo.find({
    where: {
      doctor_id,

      is_booked: false,
    },
  });

  /**
   * FUTURE
   */

  const futureSlots = slots.filter(
    (slot) => new Date(slot.start_time) > new Date(),
  );

  /**
   * SORT
   */

  futureSlots.sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  /**
   * LIMIT
   */

  return futureSlots.slice(0, 5);
}
