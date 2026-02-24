import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { sendApprovalRequest } from "@/lib/email";
import { formatDateInIsrael } from "@/lib/date-utils";

const APPROVAL_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

/** Create a lesson as pending_approval; email sent only after teacher/admin approve. */
export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const availabilityId = typeof body.availabilityId === "string" ? body.availabilityId.trim() : "";
    const teacherId = typeof body.teacherId === "string" ? body.teacherId.trim() : "";
    const dateStr = typeof body.date === "string" ? body.date.trim() : "";
    const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
    const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";

    let lesson: { id: string; status: string; date: Date; startTime: string; endTime: string; teacher: { email: string; name: string | null }; student: { email: string; name: string | null } };

    if (availabilityId) {
      const slot = await prisma.availability.findFirst({
        where: { id: availabilityId },
        include: { teacher: true },
      });
      if (!slot) {
        return NextResponse.json(
          { error: "הזמן נתפס, בחר זמן אחר" },
          { status: 409 }
        );
      }
      const result = await prisma.$transaction(async (tx) => {
        const current = await tx.availability.findFirst({
          where: { id: availabilityId },
          include: { teacher: true },
        });
        if (!current) return null;
        const created = await tx.lesson.create({
          data: {
            teacherId: current.teacherId,
            studentId: user.id,
            date: current.date,
            startTime: current.startTime,
            endTime: current.endTime,
            status: "pending_approval",
            approvalExpiresAt: new Date(Date.now() + APPROVAL_WINDOW_MS),
          },
          include: { teacher: true, student: true },
        });
        await tx.availability.delete({ where: { id: current.id } });
        return created;
      });
      if (!result) {
        return NextResponse.json(
          { error: "הזמן נתפס, בחר זמן אחר" },
          { status: 409 }
        );
      }
      lesson = result;
    } else {
      if (!teacherId || !dateStr || !startTime || !endTime) {
        return NextResponse.json(
          { error: "חסרים פרטים: מורה, תאריך או שעות" },
          { status: 400 }
        );
      }
      const date = new Date(dateStr + "T12:00:00");
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: "תאריך לא תקין" }, { status: 400 });
      }
      const teacher = await prisma.user.findFirst({
        where: { id: teacherId, role: "teacher" },
      });
      if (!teacher) {
        return NextResponse.json({ error: "מורה לא נמצא" }, { status: 404 });
      }
      lesson = await prisma.lesson.create({
        data: {
          teacherId: teacher.id,
          studentId: user.id,
          date,
          startTime,
          endTime,
          status: "pending_approval",
          approvalExpiresAt: new Date(Date.now() + APPROVAL_WINDOW_MS),
        },
        include: { teacher: true, student: true },
      });
    }

    const lessonDateStr = lesson.date.toISOString().slice(0, 10);
    const formattedDate = formatDateInIsrael(lesson.date);
    const timeRange = `${lesson.startTime}–${lesson.endTime}`;
    const studentName = lesson.student.name || lesson.student.email || "תלמיד";
    const teacherName = lesson.teacher.name || lesson.teacher.email || "מורה";
    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { email: true },
    });
    const adminEmails = admins.map((a) => a.email).filter(Boolean);
    const toEmails = Array.from(
      new Set([lesson.teacher.email, ...adminEmails])
    ).filter(Boolean);
    try {
      await sendApprovalRequest({
        to: toEmails,
        studentName,
        teacherName,
        date: formattedDate,
        timeRange,
      });
    } catch (emailErr) {
      console.error("[book/submit] Approval request email failed:", emailErr);
    }
    return NextResponse.json({
      id: lesson.id,
      status: lesson.status,
      date: lessonDateStr,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    });
  } catch (e) {
    console.error("[book/submit] Failed:", e);
    const message =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "שגיאה בשמירת ההזמנה";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
