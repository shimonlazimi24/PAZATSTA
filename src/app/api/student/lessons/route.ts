import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

function toDateStr(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return String(d).slice(0, 10);
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== "student") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const upcoming = searchParams.get("upcoming") === "true";
    const past = searchParams.get("past") === "true";

    const now = new Date();
    const startOfTodayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

    const where: { studentId: string; date?: { gte?: Date; lt?: Date } } = {
      studentId: user.id,
    };
    if (month && year) {
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      if (!Number.isNaN(y) && !Number.isNaN(m)) {
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 1);
        where.date = { gte: start, lt: end };
      }
    } else if (upcoming) {
      where.date = { gte: startOfTodayUtc };
    } else if (past) {
      where.date = { lt: startOfTodayUtc };
    }

    const lessons = await prisma.lesson.findMany({
      where,
      include: {
        teacher: {
          select: {
            id: true,
            email: true,
            name: true,
            teacherProfile: { select: { displayName: true } },
          },
        },
        student: { select: { id: true, email: true, name: true, phone: true } },
        summary: true,
      },
      orderBy: [{ date: "desc" }, { startTime: "asc" }],
    });
    return NextResponse.json(
      lessons.map((l) => ({
        id: l.id,
        date: toDateStr(l.date),
        startTime: l.startTime,
        endTime: l.endTime,
        status: l.status,
        questionFromStudent: l.questionFromStudent,
        teacher: {
          id: l.teacher.id,
          email: l.teacher.email,
          name: l.teacher.teacherProfile?.displayName ?? l.teacher.name ?? null,
        },
        student: l.student,
        summary: l.summary
          ? {
              id: l.summary.id,
              summaryText: l.summary.summaryText,
              homeworkText: l.summary.homeworkText,
              pdfUrl: l.summary.pdfUrl,
              createdAt: l.summary.createdAt instanceof Date ? l.summary.createdAt.toISOString() : String(l.summary.createdAt),
            }
          : null,
      }))
    );
  } catch (e) {
    console.error("[student/lessons] GET error:", e);
    return NextResponse.json(
      { error: "Failed to load lessons" },
      { status: 500 }
    );
  }
}
