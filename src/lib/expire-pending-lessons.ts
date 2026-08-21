import type { Prisma, PrismaClient } from "@prisma/client";
import {
  availabilityDateFromYYYYMMDD,
  formatIsraelYYYYMMDD,
  utcDayBounds,
} from "@/lib/dates";

type Tx = Prisma.TransactionClient;

type ExpirableLesson = {
  id: string;
  teacherId: string;
  date: Date;
  startTime: string;
  endTime: string;
  workshopId: string | null;
};

/**
 * Put a lesson's slot back on the teacher's availability.
 *
 * Availability rows are keyed on a date normalized to midnight UTC for the Israel
 * calendar day. Writing lesson.date straight through would miss the unique index
 * and create a duplicate or invisible slot, so every caller goes through here.
 */
export async function restoreAvailabilityForLesson(
  tx: Tx,
  lesson: ExpirableLesson
): Promise<void> {
  if (lesson.workshopId) return; // workshop seats are not slot-based
  const slotDate = availabilityDateFromYYYYMMDD(formatIsraelYYYYMMDD(lesson.date));
  await tx.availability.upsert({
    where: {
      teacherId_date_startTime: {
        teacherId: lesson.teacherId,
        date: slotDate,
        startTime: lesson.startTime,
      },
    },
    create: {
      teacherId: lesson.teacherId,
      date: slotDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    },
    update: {},
  });
}

/** Cancel one expired pending lesson and restore its availability slot (non-workshop). */
export async function cancelExpiredPendingLesson(
  tx: Tx,
  lesson: ExpirableLesson
): Promise<void> {
  await tx.lesson.update({
    where: { id: lesson.id },
    data: { status: "canceled" },
  });
  await restoreAvailabilityForLesson(tx, lesson);
}

/** Cancel all overdue pending_approval lessons (used by cron and availability reads). */
export async function expireOverduePendingLessons(
  prisma: PrismaClient
): Promise<{ expired: number; restored: number }> {
  const now = new Date();
  const expired = await prisma.lesson.findMany({
    where: {
      status: "pending_approval",
      approvalExpiresAt: { lt: now },
    },
    select: {
      id: true,
      teacherId: true,
      date: true,
      startTime: true,
      endTime: true,
      workshopId: true,
    },
  });

  let restored = 0;
  for (const lesson of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        await cancelExpiredPendingLesson(tx, lesson);
      });
      restored++;
    } catch (e) {
      console.error("[expire-pending-lessons] Failed for lesson", lesson.id, e);
    }
  }

  return { expired: expired.length, restored };
}

/** Cancel expired pending lessons blocking a specific slot before a new booking. */
export async function expirePendingForSlotInTx(
  tx: Tx,
  teacherId: string,
  dateStr: string,
  startTime: string
): Promise<number> {
  const now = new Date();
  const day = utcDayBounds(dateStr);
  const expired = await tx.lesson.findMany({
    where: {
      teacherId,
      startTime,
      date: { gte: day.gte, lte: day.lte },
      status: "pending_approval",
      approvalExpiresAt: { lt: now },
      workshopId: null,
    },
    select: {
      id: true,
      teacherId: true,
      date: true,
      startTime: true,
      endTime: true,
      workshopId: true,
    },
  });

  for (const lesson of expired) {
    await cancelExpiredPendingLesson(tx, lesson);
  }
  return expired.length;
}
