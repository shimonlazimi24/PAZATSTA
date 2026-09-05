import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { restoreAvailabilityForLesson } from "@/lib/expire-pending-lessons";
import { resolveAdminRecipients } from "@/lib/admin";
import { sendLessonCanceled } from "@/lib/email";
import { formatDateInIsrael } from "@/lib/date-utils";

/** Teacher or admin cancels a scheduled lesson; restores the slot to availability. */
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
    include: {
      teacher: { select: { email: true, name: true } },
      student: {
        select: {
          email: true,
          name: true,
          studentProfile: { select: { parentEmail: true, studentFullName: true } },
        },
      },
    },
  });
  if (!lesson) {
    return NextResponse.json({ error: "שיעור לא נמצא" }, { status: 404 });
  }
  if (lesson.status !== "scheduled") {
    return NextResponse.json(
      { error: "ניתן לבטל רק שיעורים מתוזמנים" },
      { status: 400 }
    );
  }
  if (!isAdmin && lesson.teacherId !== user.id) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.lesson.update({
      where: { id: lessonId },
      data: { status: "canceled" },
    });
    await restoreAvailabilityForLesson(tx, lesson);
  });

  // Canceling told nobody. A student whose lesson disappears from the calendar
  // with no message has no way to know it happened.
  const studentName =
    lesson.student.studentProfile?.studentFullName?.trim() ||
    lesson.student.name ||
    lesson.student.email ||
    "תלמיד";
  const parentEmail = lesson.student.studentProfile?.parentEmail?.trim();
  try {
    await sendLessonCanceled({
      to: [
        lesson.student.email,
        lesson.teacher.email,
        ...(parentEmail ? [parentEmail] : []),
        ...(await resolveAdminRecipients()),
      ],
      studentName,
      teacherName: lesson.teacher.name || lesson.teacher.email || "מורה",
      dateLabel: formatDateInIsrael(lesson.date),
      timeRange: `${lesson.startTime}–${lesson.endTime}`,
      topic: lesson.topic,
    });
  } catch (emailErr) {
    // The cancellation already committed; a failed notice must not undo it.
    console.error("[lessons/cancel] Notification failed:", emailErr);
  }

  return NextResponse.json({ ok: true, status: "canceled" });
}
