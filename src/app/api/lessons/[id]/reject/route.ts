import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { canActOnLesson } from "@/lib/lesson-authz";

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
  const allowed = canActOnLesson({ isAdmin, userId: user.id }, lesson);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.message }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.lesson.update({
      where: { id: lessonId },
      data: { status: "canceled" },
    });
    if (!lesson.workshopId) {
      await tx.availability.upsert({
        where: {
          teacherId_date_startTime: {
            teacherId: lesson.teacherId,
            date: lesson.date,
            startTime: lesson.startTime,
          },
        },
        create: {
          teacherId: lesson.teacherId,
          date: lesson.date,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
        },
        update: {},
      });
    }
  });

  return NextResponse.json({ ok: true, status: "canceled" });
}
