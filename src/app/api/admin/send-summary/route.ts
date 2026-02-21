import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { sendAdminSummary } from "@/lib/email";

const DEFAULT_DAYS = 7;

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const end = new Date();
    const start = new Date();
    if (body.startDate && body.endDate) {
      start.setTime(new Date(body.startDate).getTime());
      end.setTime(new Date(body.endDate).getTime());
    } else {
      start.setDate(start.getDate() - DEFAULT_DAYS);
      start.setHours(0, 0, 0, 0);
    }
    const lessons = await prisma.lesson.findMany({
      where: {
        status: "completed",
        date: { gte: start, lte: end },
      },
      include: {
        teacher: { select: { email: true, name: true } },
        student: { select: { email: true, name: true } },
        summary: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    await sendAdminSummary({
      to: user.email,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      lessons: lessons.map((l) => ({
        date: l.date.toISOString().slice(0, 10),
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
    return NextResponse.json(
      { error: "שגיאה בשליחת הסיכום" },
      { status: 500 }
    );
  }
}
