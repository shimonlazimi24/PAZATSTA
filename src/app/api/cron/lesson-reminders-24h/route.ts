import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getLessonReminder24hContent, sendMessages, type OutgoingEmail } from "@/lib/email";
import { validateCronAuth } from "@/lib/cron-auth";
import { lessonStartsAtUtc } from "@/lib/lesson-start";
import { formatDateInIsrael } from "@/lib/date-utils";
import { isValidDeliveryEmail } from "@/lib/validation";

const MS_HOUR = 60 * 60 * 1000;
/**
 * Target ~24h before lesson start. On Vercel Hobby, cron may run only once per day
 * (see vercel.json), so the window is wider than the old hourly 22–26h band.
 */
const WINDOW_MIN_H = 18;
const WINDOW_MAX_H = 30;

/**
 * Send one email to student + parent ~24h before scheduled lesson (Israel time).
 * Sets Lesson.reminder24hSentAt to avoid duplicates.
 *
 * Messages for the whole run are collected first and sent in batches, then the
 * lessons are marked in one updateMany. Sending per lesson meant one HTTP round
 * trip and one UPDATE each, which on a full run could outlast the cron timeout
 * and leave the tail of the list silently un-reminded.
 */
export async function GET(req: Request) {
  const authError = validateCronAuth(req);
  if (authError) return authError;

  const now = Date.now();
  const windowStart = now + WINDOW_MIN_H * MS_HOUR;
  const windowEnd = now + WINDOW_MAX_H * MS_HOUR;

  const minDate = new Date(now - 2 * 24 * 60 * 60 * 1000);

  const lessons = await prisma.lesson.findMany({
    where: {
      status: "scheduled",
      reminder24hSentAt: null,
      date: { gte: minDate },
    },
    include: {
      teacher: { select: { name: true, email: true } },
      student: { include: { studentProfile: true } },
      workshop: { select: { name: true } },
    },
    take: 500,
  });

  const messages: OutgoingEmail[] = [];
  const remindedLessonIds: string[] = [];
  let skipped = 0;

  for (const lesson of lessons) {
    let lessonStartMs: number;
    try {
      lessonStartMs = lessonStartsAtUtc(lesson.date, lesson.startTime).getTime();
    } catch (e) {
      console.warn("[cron/lesson-reminders-24h] skip bad time", lesson.id, e);
      skipped++;
      continue;
    }

    if (lessonStartMs < windowStart || lessonStartMs > windowEnd) continue;

    const parentEmail = lesson.student.studentProfile?.parentEmail?.trim() ?? null;
    const recipients = Array.from(
      new Set(
        [lesson.student.email, parentEmail]
          .filter((e): e is string => !!e && isValidDeliveryEmail(e))
          .map((e) => e.trim().toLowerCase())
      )
    );
    if (recipients.length === 0) {
      skipped++;
      continue;
    }

    const { subject, text } = getLessonReminder24hContent({
      studentName: lesson.student.name?.trim() || lesson.student.email || "תלמיד",
      teacherName: lesson.teacher.name?.trim() || lesson.teacher.email || "מורה",
      dateLabel: formatDateInIsrael(lesson.date),
      timeRange: `${lesson.startTime}–${lesson.endTime}`,
      topic: lesson.topic,
      isWorkshop: Boolean(lesson.workshopId),
      workshopName: lesson.workshop?.name ?? null,
    });

    for (const to of recipients) messages.push({ to, subject, text });
    remindedLessonIds.push(lesson.id);
  }

  if (messages.length === 0) {
    return NextResponse.json({ ok: true, remindersSent: 0, skipped });
  }

  try {
    await sendMessages("cron/lesson-reminders-24h", messages);
  } catch (e) {
    // Nothing is marked as sent, so the next run retries the whole window.
    console.error("[cron/lesson-reminders-24h] Batch send failed:", e);
    return NextResponse.json(
      { ok: false, error: "Failed to send reminders", skipped },
      { status: 502 }
    );
  }

  await prisma.lesson.updateMany({
    where: { id: { in: remindedLessonIds } },
    data: { reminder24hSentAt: new Date() },
  });

  return NextResponse.json({
    ok: true,
    remindersSent: remindedLessonIds.length,
    emailsSent: messages.length,
    skipped,
  });
}
