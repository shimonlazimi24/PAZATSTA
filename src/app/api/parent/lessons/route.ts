import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function GET() {
  const user = await getUserFromSession();
  if (!user || user.role !== "parent") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const students = await prisma.user.findMany({
    where: {
      role: "student",
      studentProfile: { parentId: user.id },
    },
    select: { id: true },
  });
  const studentIds = students.map((s) => s.id);
  if (studentIds.length === 0) {
    return NextResponse.json([]);
  }
  const lessons = await prisma.lesson.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      teacher: { select: { id: true, email: true, name: true } },
      student: { select: { id: true, email: true, name: true } },
      summary: true,
    },
    orderBy: [{ date: "desc" }, { startTime: "asc" }],
  });
  return NextResponse.json(
    lessons.map((l) => ({
      id: l.id,
      date: l.date.toISOString().slice(0, 10),
      startTime: l.startTime,
      endTime: l.endTime,
      status: l.status,
      teacher: l.teacher,
      student: l.student,
      summary: l.summary
        ? {
            pdfUrl: l.summary.pdfUrl,
            createdAt: l.summary.createdAt.toISOString(),
          }
        : null,
    }))
  );
}
