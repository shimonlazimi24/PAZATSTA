import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const lesson = await prisma.lesson.findFirst({
    where: { id, teacherId: user.id },
    include: {
      student: { select: { id: true, email: true, name: true } },
      summary: true,
    },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: lesson.id,
    date: lesson.date.toISOString().slice(0, 10),
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    status: lesson.status,
    reportCompleted: lesson.reportCompleted,
    student: lesson.student,
    summary: lesson.summary
      ? {
          summaryText: lesson.summary.summaryText,
          homeworkText: lesson.summary.homeworkText,
          pdfUrl: lesson.summary.pdfUrl,
        }
      : null,
  });
}
