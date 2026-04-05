import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendLessonReminder24h } from "@/lib/email";
import { validateCronAuth } from "@/lib/cron-auth";
import { lessonStartsAtUtc } from "@/lib/lesson-start";
import { formatDateInIsrael } from "@/lib/date-utils";

const MS_HOUR = 60 * 60 * 1000;
/** Lesson starts between ~22h and ~26h from now (cron hourly tolerates delays). */
const WINDOW_MIN_H = 22;
const WINDOW_MAX_H = 26;

/**
 * Hourly: send one email to student + parent ~24h before scheduled lesson (Israel time).
 * Sets Lesson.reminder24hSentAt to avoid duplicates.
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

  let sent = 0;
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

    if (lessonStartMs < windowStart || lessonStartMs > windowEnd) {
      continue;
    }

    const studentName = lesson.student.name?.trim() || lesson.student.email || "תלמיד";
    const teacherName =
      lesson.teacher.name?.trim() || lesson.teacher.email || "מורה";
    const dateLabel = formatDateInIsrael(lesson.date);
    const timeRange = `${lesson.startTime}–${lesson.endTime}`;
    const profile = lesson.student.studentProfile;
    const parentEmail = profile?.parentEmail?.trim() ?? null;

    const to = [lesson.student.email, parentEmail].filter(
      (e): e is string => typeof e === "string" && e.length > 0
    );

    try {
      const mailed = await sendLessonReminder24h({
        to,
        studentName,
        teacherName,
        dateLabel,
        timeRange,
        topic: lesson.topic,
        isWorkshop: Boolean(lesson.workshopId),
        workshopName: lesson.workshop?.name ?? null,
      });
      if (!mailed) {
        skipped++;
        continue;
      }
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: { reminder24hSentAt: new Date() },
      });
      sent++;
    } catch (e) {
      console.error("[cron/lesson-reminders-24h] Failed lesson", lesson.id, e);
    }
  }

  return NextResponse.json({ ok: true, remindersSent: sent, skipped });
}
