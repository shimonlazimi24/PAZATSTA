import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { sendWeeklyHoursSummaryToAdmin } from "@/lib/email";

const DEFAULT_DAYS = 7;
const EMAIL_TIMEZONE = "Asia/Jerusalem";

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

/** Format a Date as YYYY-MM-DD in Israel. */
function formatDateIsrael(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: EMAIL_TIMEZONE });
}

/** Parse "YYYY-MM-DD" and return start-of-day UTC; invalid → null. */
function parseDateOnly(s: unknown): Date | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return null;
  const d = new Date(s.trim() + "T00:00:00.000Z");
  return isNaN(d.getTime()) ? null : d;
}

/**
 * POST: Send hours summary to admin (for payment).
 * Body: { startDate?: "YYYY-MM-DD", endDate?: "YYYY-MM-DD" }
 * Default: last 7 days.
 */
export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));

    let start: Date;
    let end: Date;
    let startDateStr: string;
    let endDateStr: string;

    if (body.startDate != null && body.endDate != null) {
      const parsedStart = parseDateOnly(body.startDate);
      const parsedEnd = parseDateOnly(body.endDate);
      if (!parsedStart) {
        return NextResponse.json(
          { error: "תאריך התחלה לא תקין. השתמש בפורמט YYYY-MM-DD." },
          { status: 400 }
        );
      }
      if (!parsedEnd) {
        return NextResponse.json(
          { error: "תאריך סיום לא תקין. השתמש בפורמט YYYY-MM-DD." },
          { status: 400 }
        );
      }
      if (parsedStart.getTime() > parsedEnd.getTime()) {
        return NextResponse.json(
          { error: "תאריך ההתחלה חייב להיות לפני או שווה לתאריך הסיום." },
          { status: 400 }
        );
      }
      start = parsedStart;
      end = new Date(parsedEnd.getTime() + 24 * 60 * 60 * 1000 - 1);
      startDateStr = body.startDate.trim();
      endDateStr = body.endDate.trim();
    } else {
      end = new Date();
      end.setHours(23, 59, 59, 999);
      start = new Date(end);
      start.setDate(start.getDate() - DEFAULT_DAYS);
      start.setHours(0, 0, 0, 0);
      startDateStr = formatDateIsrael(start);
      endDateStr = formatDateIsrael(end);
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        status: "completed",
        date: { gte: start, lte: end },
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

    if (byTeacher.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "אין שיעורים שהושלמו בטווח התאריכים",
      });
    }

    await sendWeeklyHoursSummaryToAdmin({
      to: [user.email],
      startDate: startDateStr,
      endDate: endDateStr,
      byTeacher,
    });

    return NextResponse.json({
      ok: true,
      message: `סיכום שעות נשלח לאימייל (${byTeacher.length} מורים, ${startDateStr} – ${endDateStr})`,
    });
  } catch (e) {
    console.error("[admin/send-hours-summary]", e);
    return NextResponse.json(
      { error: "שגיאה בשליחת סיכום השעות" },
      { status: 500 }
    );
  }
}
