import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";

/** Teacher or admin rejects a pending lesson; cancels and restores the slot to availability. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const isAdmin = canAccessAdmin(user);
  const isTeacher = user.role === "teacher";
  if (!isAdmin && !isTeacher) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id: lessonId } = await params;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });
  if (!lesson) {
    return NextResponse.json({ error: "שיעור לא נמצא" }, { status: 404 });
  }
  if (lesson.status !== "pending_approval") {
    return NextResponse.json(
      { error: "השיעור לא ממתין לאישור" },
      { status: 400 }
    );
  }
  if (isTeacher && lesson.teacherId !== user.id) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.lesson.update({
      where: { id: lessonId },
      data: { status: "canceled" },
    });
    await tx.availability.create({
      data: {
        teacherId: lesson.teacherId,
        date: lesson.date,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
      },
    });
  });

  return NextResponse.json({ ok: true, status: "canceled" });
}
