import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { sendAdminSummary } from "@/lib/email";

const DEFAULT_DAYS = 7;
const MAX_LESSONS = 200;
const EMAIL_TIMEZONE = "Asia/Jerusalem";

/** Format a Date as YYYY-MM-DD in Israel for display in emails. */
function formatDateIsrael(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: EMAIL_TIMEZONE });
}

/** Parse "YYYY-MM-DD" and return start-of-day UTC; invalid → null. */
function parseDateOnly(s: unknown): Date | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return null;
  const d = new Date(s.trim() + "T00:00:00.000Z");
  return isNaN(d.getTime()) ? null : d;
}

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
      end = new Date(parsedEnd.getTime() + 24 * 60 * 60 * 1000 - 1); // end of day UTC
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
        teacher: { select: { email: true, name: true } },
        student: { select: { email: true, name: true } },
        summary: { select: { summaryText: true, homeworkText: true } },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: MAX_LESSONS + 1,
    });

    if (lessons.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No completed lessons in range",
      });
    }

    if (lessons.length > MAX_LESSONS) {
      return NextResponse.json(
        { error: "Too many lessons in range. Narrow the date range or contact support." },
        { status: 413 }
      );
    }

    await sendAdminSummary({
      to: user.email,
      startDate: startDateStr,
      endDate: endDateStr,
      lessons: lessons.map((l) => ({
        date: formatDateIsrael(l.date),
        startTime: l.startTime,
        endTime: l.endTime,
        teacherName: l.teacher.name || l.teacher.email,
        studentName: l.student.name || l.student.email,
        summaryText: l.summary?.summaryText ?? "",
        homeworkText: l.summary?.homeworkText ?? "",
      })),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/send-summary]", e);
    return NextResponse.json(
      { error: "שגיאה בשליחת הסיכום" },
      { status: 500 }
    );
  }
}
