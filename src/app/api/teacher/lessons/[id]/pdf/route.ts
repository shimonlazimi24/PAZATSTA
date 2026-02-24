import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateAndStoreLessonPdf } from "@/lib/pdf/generateLessonSummaryPdf";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: lessonId } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId },
    include: {
      summary: true,
      teacher: { select: { id: true } },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }

  if (!lesson.summary) {
    return NextResponse.json(
      { error: "No summary yet" },
      { status: 400 }
    );
  }

  if (user.role === "teacher" && lesson.teacherId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  if (!force && lesson.summary.pdfUrl) {
    return NextResponse.json({ pdfUrl: lesson.summary.pdfUrl });
  }

  const result = await generateAndStoreLessonPdf(lessonId);
  if (!result.pdfUrl) {
    return NextResponse.json(
      { error: "PDF generation failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ pdfUrl: result.pdfUrl });
}
