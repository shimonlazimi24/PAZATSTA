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

/** Cancel all overdue pending_approval lessons. Called by the hourly cron. */
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

  if (expired.length === 0) return { expired: 0, restored: 0 };

  // One transaction for the whole sweep rather than one per lesson: the previous
  // shape issued 2N queries in N transactions, which on a backlog was the slowest
  // thing the cron did.
  const slots = expired
    .filter((l) => !l.workshopId)
    .map((l) => ({
      teacherId: l.teacherId,
      date: availabilityDateFromYYYYMMDD(formatIsraelYYYYMMDD(l.date)),
      startTime: l.startTime,
      endTime: l.endTime,
    }));

  try {
    const [, restoredResult] = await prisma.$transaction([
      prisma.lesson.updateMany({
        where: { id: { in: expired.map((l) => l.id) } },
        data: { status: "canceled" },
      }),
      // skipDuplicates covers the slot already being back on the calendar.
      prisma.availability.createMany({ data: slots, skipDuplicates: true }),
    ]);
    return { expired: expired.length, restored: restoredResult.count };
  } catch (e) {
    console.error("[expire-pending-lessons] Sweep failed:", e);
    throw e;
  }
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
