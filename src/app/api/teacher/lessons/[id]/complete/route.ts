import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { getLessonSummaryHtml, htmlToPdfBuffer, savePdfToStorage } from "@/lib/pdf";
import { sendLessonCompleted } from "@/lib/email";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: lessonId } = await params;
  try {
    const body = await req.json();
    const summaryText = typeof body.summaryText === "string" ? body.summaryText.trim() : "";
    const homeworkText = typeof body.homeworkText === "string" ? body.homeworkText.trim() : "";
    if (!summaryText && !homeworkText) {
      return NextResponse.json(
        { error: "summaryText or homeworkText required" },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: user.id, status: "scheduled" },
      include: { teacher: true, student: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
    }

    const dateStr = lesson.date.toISOString().slice(0, 10);
    const timeRange = `${lesson.startTime}–${lesson.endTime}`;
    const teacherName = lesson.teacher.name || lesson.teacher.email;
    const studentName = lesson.student.name || lesson.student.email;

    const html = getLessonSummaryHtml({
      studentName,
      teacherName,
      date: dateStr,
      timeRange,
      summaryText: summaryText || "—",
      homeworkText: homeworkText || "—",
    });

    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await htmlToPdfBuffer(html);
    } catch (pdfErr) {
      return NextResponse.json(
        { error: "PDF generation failed" },
        { status: 500 }
      );
    }

    const filename = `${lessonId}.pdf`;
    let pdfUrl: string | null = null;
    try {
      pdfUrl = await savePdfToStorage(pdfBuffer, filename);
    } catch {
      pdfUrl = null;
    }

    await prisma.$transaction([
      prisma.lessonSummary.create({
        data: {
          lessonId: lesson.id,
          summaryText: summaryText || "",
          homeworkText: homeworkText || "",
          pdfUrl,
        },
      }),
      prisma.lesson.update({
        where: { id: lesson.id },
        data: { status: "completed", reportCompleted: true },
      }),
    ]);

    const adminUsers = await prisma.user.findMany({
      where: { role: "admin" },
      select: { email: true },
    });
    const toEmails = [
      lesson.teacher.email,
      lesson.student.email,
      ...adminUsers.map((a) => a.email),
    ];
    await sendLessonCompleted({
      to: Array.from(new Set(toEmails)),
      studentName,
      teacherName,
      date: dateStr,
      summaryText: summaryText || "—",
      homeworkText: homeworkText || "—",
      pdfBuffer,
      pdfFilename: `lesson-summary-${dateStr}.pdf`,
    });

    return NextResponse.json({
      ok: true,
      pdfUrl,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to complete lesson" },
      { status: 500 }
    );
  }
}
