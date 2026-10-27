import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { canActOnLesson } from "@/lib/lesson-authz";
import { formatDateInIsrael } from "@/lib/date-utils";
import { isLessonStarted } from "@/lib/dates";
import { decideNotHeld } from "@/lib/lesson-not-held";

/**
 * Marks a lesson that has already passed as not held, so it leaves the hours
 * summary. No availability is restored (the time has passed) and the student is
 * not emailed (they know the lesson did not happen).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  const isAdmin = canAccessAdmin(user);
  if (!isAdmin && user.role !== "teacher") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    select: { id: true, status: true, date: true, startTime: true, teacherId: true, workshopId: true },
  });
  if (!lesson) {
    return NextResponse.json({ error: "שיעור לא נמצא" }, { status: 404 });
  }

  const allowed = canActOnLesson({ isAdmin, userId: user.id }, lesson);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.message }, { status: 403 });
  }

  const decision = decideNotHeld({
    status: lesson.status,
    lessonStarted: isLessonStarted(formatDateInIsrael(lesson.date), lesson.startTime),
    isAdmin,
  });
  if (!decision.ok) {
    return NextResponse.json({ error: decision.message }, { status: decision.status });
  }

  // Conditional update: if the status changed since we read it, nothing is written.
  const updated = await prisma.lesson.updateMany({
    where: { id, status: decision.from },
    data: { status: "canceled", canceledAt: new Date() },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "השיעור השתנה בינתיים. רעננו את הדף ונסו שוב" }, { status: 409 });
  }

  console.info(`[not-held] lesson ${id} ${decision.from} -> canceled by ${isAdmin ? "admin" : "teacher"} ${user.id}`);
  return NextResponse.json({ ok: true });
}
