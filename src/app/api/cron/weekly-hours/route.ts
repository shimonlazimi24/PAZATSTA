import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendWeeklyHoursSummaryToAdmin } from "@/lib/email";
import { validateCronAuth } from "@/lib/cron-auth";

/** Parse "HH:MM" or "HHMM" to minutes since midnight. */
function timeToMinutes(t: string): number {
  const normalized = String(t).replace(/\s/g, "").replace(":", "");
  const h = parseInt(normalized.slice(0, 2), 10) || 0;
  const m = parseInt(normalized.slice(2, 4), 10) || 0;
  return h * 60 + m;
}

function durationHours(startTime: string, endTime: string): number {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end <= start) return 0;
  return (end - start) / 60;
}

/** Last month = 1st of previous month 00:00 UTC to 1st of current month 00:00 UTC. */
function getLastMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  return { start, end };
}

/** Run monthly: sum completed lesson hours per teacher for last month; email admin(s). */
export async function GET(req: Request) {
  const authError = validateCronAuth(req);
  if (authError) return authError;

  const { start, end } = getLastMonthRange();
  const startStr = start.toISOString().slice(0, 10);
  const endStr = new Date(end.getTime() - 1).toISOString().slice(0, 10);

  const lessons = await prisma.lesson.findMany({
    where: {
      status: "completed",
      date: { gte: start, lt: end },
    },
    include: {
      teacher: { select: { id: true, email: true, name: true } },
    },
  });

  const byTeacherId = new Map<
    string,
    { teacherName: string; teacherEmail: string; hours: number; lessonCount: number }
  >();

  for (const l of lessons) {
    const hours = durationHours(l.startTime, l.endTime);
    const existing = byTeacherId.get(l.teacherId);
    const teacherName = l.teacher.name || l.teacher.email;
    const teacherEmail = l.teacher.email;
    if (existing) {
      existing.hours += hours;
      existing.lessonCount += 1;
    } else {
      byTeacherId.set(l.teacherId, {
        teacherName,
        teacherEmail,
        hours,
        lessonCount: 1,
      });
    }
  }

  const byTeacher = Array.from(byTeacherId.values());

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { email: true },
  });
  const adminEmails = admins.map((a) => a.email).filter(Boolean);

  if (adminEmails.length > 0 && byTeacher.length > 0) {
    try {
      await sendWeeklyHoursSummaryToAdmin({
        to: adminEmails,
        startDate: startStr,
        endDate: endStr,
        byTeacher,
      });
    } catch (e) {
      console.error("[cron/weekly-hours] Send failed:", e);
      return NextResponse.json(
        { error: "Failed to send monthly hours email" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    startDate: startStr,
    endDate: endStr,
    teachersCount: byTeacher.length,
    adminsNotified: adminEmails.length,
  });
}
