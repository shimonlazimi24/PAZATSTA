import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function GET(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");
  const upcoming = searchParams.get("upcoming") === "true";

  const where: { teacherId: string; date?: { gte?: Date; lt?: Date } } = {
    teacherId: user.id,
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
    where.date = { gte: new Date() };
  }

  const lessons = await prisma.lesson.findMany({
    where,
    include: {
      student: { select: { id: true, email: true, name: true } },
      summary: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(
    lessons.map((l) => ({
      id: l.id,
      date: l.date.toISOString().slice(0, 10),
      startTime: l.startTime,
      endTime: l.endTime,
      status: l.status,
      questionFromStudent: l.questionFromStudent,
      student: l.student,
      summary: l.summary
        ? {
            id: l.summary.id,
            summaryText: l.summary.summaryText,
            homeworkText: l.summary.homeworkText,
            pdfUrl: l.summary.pdfUrl,
            createdAt: l.summary.createdAt.toISOString(),
          }
        : null,
    }))
  );
}
