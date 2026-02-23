import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { sendBookingConfirmation } from "@/lib/email";
import { formatDateInIsrael } from "@/lib/date-utils";

/** Teacher or admin approves a pending lesson; sets status to scheduled and sends booking email. */
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
  const now = new Date();

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      teacher: { select: { id: true, email: true, name: true } },
      student: { select: { id: true, email: true, name: true } },
    },
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
  if (lesson.approvalExpiresAt && lesson.approvalExpiresAt < now) {
    return NextResponse.json(
      { error: "פג תוקף האישור" },
      { status: 400 }
    );
  }
  if (isTeacher && lesson.teacherId !== user.id) {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const approvedByTeacherAt = isTeacher ? now : lesson.approvedByTeacherAt ?? undefined;
  const approvedByAdminAt = isAdmin ? now : lesson.approvedByAdminAt ?? undefined;

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      status: "scheduled",
      approvedByTeacherAt: approvedByTeacherAt ?? undefined,
      approvedByAdminAt: approvedByAdminAt ?? undefined,
    },
  });

  const timeRange = `${lesson.startTime}–${lesson.endTime}`;
  const teacherName = lesson.teacher.name || lesson.teacher.email;
  const studentName = lesson.student.name || lesson.student.email;
  const dateStr = formatDateInIsrael(lesson.date);

  const studentProfile = await prisma.studentProfile.findUnique({
    where: { userId: lesson.studentId },
  });
  const topic = studentProfile?.currentScreeningType ?? undefined;
  const screeningDate = studentProfile?.currentScreeningDate
    ? formatDateInIsrael(studentProfile.currentScreeningDate)
    : undefined;

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: { email: true },
  });
  const adminEmails = admins.map((a) => a.email).filter(Boolean);
  const toEmails = Array.from(
    new Set([lesson.teacher.email, lesson.student.email, ...adminEmails])
  );

  try {
    await sendBookingConfirmation({
      to: toEmails,
      studentName: studentName || "תלמיד",
      teacherName,
      date: dateStr,
      timeRange,
      topic,
      screeningDate,
    });
  } catch (emailErr) {
    console.error("[lessons/approve] Email send failed:", emailErr);
  }

  return NextResponse.json({ ok: true, status: "scheduled" });
}
