import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: lessonId } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: { id: lessonId, teacherId: user.id },
  });
  if (!lesson) {
    return NextResponse.json({ error: "Lesson not found" }, { status: 404 });
  }
  if (!lesson.reportCompleted) {
    return NextResponse.json(
      { error: "יש להשלים דוח שיעור לפני סימון מעקב" },
      { status: 400 }
    );
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { followUpCompletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
