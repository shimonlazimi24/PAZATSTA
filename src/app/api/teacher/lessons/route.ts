import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { todayIsraelYYYYMMDD, nowIsraelHHMM, normalizeTimeForCompare } from "@/lib/dates";
import { formatDateInIsrael } from "@/lib/date-utils";
import type { Prisma } from "@prisma/client";

const includeStudentSummary = {
  student: {
    select: {
      id: true,
      email: true,
      name: true,
      studentProfile: {
        select: {
          currentScreeningDate: true,
          currentScreeningType: true,
        },
      },
    },
  },
  summary: true,
} as const;

function mapLesson(l: {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  followUpCompletedAt: Date | null;
  questionFromStudent: string | null;
  student: {
    id: string;
    email: string;
    name: string | null;
    studentProfile: { currentScreeningDate: Date | null; currentScreeningType: string | null } | null;
  };
  summary: { id: string; summaryText: string; homeworkText: string; pdfUrl: string | null; createdAt: Date } | null;
}) {
  const student = l.student;
  const profile = student.studentProfile;
  return {
    id: l.id,
    date: l.date.toISOString().slice(0, 10),
    startTime: l.startTime,
    endTime: l.endTime,
    status: l.status,
    followUpCompletedAt: l.followUpCompletedAt?.toISOString() ?? null,
    questionFromStudent: l.questionFromStudent,
    student: {
      id: student.id,
      email: student.email,
      name: student.name,
      screeningDate: profile?.currentScreeningDate?.toISOString().slice(0, 10) ?? null,
      screeningType: profile?.currentScreeningType ?? null,
    },
    summary: l.summary
      ? {
          id: l.summary.id,
          summaryText: l.summary.summaryText,
          homeworkText: l.summary.homeworkText,
          pdfUrl: l.summary.pdfUrl,
          createdAt: l.summary.createdAt.toISOString(),
        }
      : null,
  };
}

export async function GET(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const upcoming = searchParams.get("upcoming") === "true";
  const pending = searchParams.get("pending") === "true";
  const past = searchParams.get("past") === "true";
  const now = new Date();
  const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

  // Dashboard mode: return both upcoming and past in one request (faster)
  // Past = lessons that have ended (by Israel time). Upcoming = not yet ended.
  if (upcoming && past && !month && !year && !pending) {
    const todayStr = todayIsraelYYYYMMDD();
    const nowTime = normalizeTimeForCompare(nowIsraelHHMM());
    const [upcomingFromDb, pastFromDb] = await Promise.all([
      prisma.lesson.findMany({
        where: {
          teacherId: user.id,
          date: { gte: startOfTodayUtc },
          status: "scheduled",
        },
        include: includeStudentSummary,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.lesson.findMany({
        where: {
          teacherId: user.id,
          date: { lt: startOfTodayUtc },
        },
        include: includeStudentSummary,
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        take: 50,
      }),
    ]);
    const lessonDateStr = (d: Date) => formatDateInIsrael(d);
    const endedToday = upcomingFromDb.filter((l) => {
      const dateStr = lessonDateStr(l.date);
      return dateStr === todayStr && normalizeTimeForCompare(l.endTime) <= nowTime;
    });
    const stillUpcoming = upcomingFromDb.filter((l) => {
      const dateStr = lessonDateStr(l.date);
      return dateStr !== todayStr || normalizeTimeForCompare(l.endTime) > nowTime;
    });
    const allPast = [
      ...endedToday.sort((a, b) => {
        const d = b.date.getTime() - a.date.getTime();
        if (d !== 0) return d;
        return normalizeTimeForCompare(b.endTime).localeCompare(normalizeTimeForCompare(a.endTime));
      }),
      ...pastFromDb,
    ].slice(0, 50);
    return NextResponse.json({
      upcoming: stillUpcoming.map((l) => mapLesson(l as Parameters<typeof mapLesson>[0])),
      past: allPast.map((l) => mapLesson(l as Parameters<typeof mapLesson>[0])),
    });
  }

  const where: Prisma.LessonWhereInput = {
    teacherId: user.id,
  };
  if (pending) {
    where.status = "pending_approval";
    where.approvalExpiresAt = { gt: now };
  } else if (month && year) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    if (!Number.isNaN(y) && !Number.isNaN(m)) {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      where.date = { gte: start, lt: end };
    }
  } else if (upcoming) {
    where.date = { gte: startOfTodayUtc };
    where.status = "scheduled";
  } else if (past) {
    where.date = { lt: startOfTodayUtc };
  }

  const lessons = await prisma.lesson.findMany({
    where,
    include: includeStudentSummary,
    orderBy: pending
      ? [{ approvalExpiresAt: "asc" }, { date: "asc" }, { startTime: "asc" }]
      : past
        ? [{ date: "desc" }, { startTime: "desc" }]
        : [{ date: "asc" }, { startTime: "asc" }],
    ...(past && !upcoming ? { take: 50 } : {}),
  });
  return NextResponse.json(lessons.map((l) => mapLesson(l as Parameters<typeof mapLesson>[0])));
}
