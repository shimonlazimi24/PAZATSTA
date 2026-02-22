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
      teacher: { select: { id: true, email: true, name: true } },
      student: {
        include: {
          studentProfile: { select: { currentScreeningType: true, currentScreeningDate: true } },
        },
      },
      summary: true,
    },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }
  const profile = lesson.student.studentProfile;
  return NextResponse.json({
    id: lesson.id,
    date: lesson.date.toISOString().slice(0, 10),
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    status: lesson.status,
    reportCompleted: lesson.reportCompleted,
    teacher: lesson.teacher,
    student: {
      id: lesson.student.id,
      email: lesson.student.email,
      name: lesson.student.name,
      screeningType: profile?.currentScreeningType ?? null,
      screeningDate: profile?.currentScreeningDate?.toISOString().slice(0, 10) ?? null,
    },
    summary: lesson.summary
      ? {
          summaryText: lesson.summary.summaryText,
          homeworkText: lesson.summary.homeworkText,
          pointsToKeep: lesson.summary.pointsToKeep,
          pointsToImprove: lesson.summary.pointsToImprove,
          tips: lesson.summary.tips,
          recommendations: lesson.summary.recommendations,
          pdfUrl: lesson.summary.pdfUrl,
        }
      : null,
  });
}
