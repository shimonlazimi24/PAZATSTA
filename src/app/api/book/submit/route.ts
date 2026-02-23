import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { sendBookingConfirmation } from "@/lib/email";

/** Create a lesson from the public /book form when student is logged in. Sends סיכום הזמנה to teacher, student, admin. */
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

    let lesson: { id: string; date: Date; startTime: string; endTime: string; teacher: { email: string; name: string | null }; student: { email: string; name: string | null } };

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
            status: "scheduled",
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
          status: "scheduled",
        },
        include: { teacher: true, student: true },
      });
    }

    const timeRange = `${lesson.startTime}–${lesson.endTime}`;
    const teacherName = lesson.teacher.name || lesson.teacher.email;
    const studentName = lesson.student.name || lesson.student.email;
    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
    });
    const topic = studentProfile?.currentScreeningType ?? undefined;
    const screeningDate = studentProfile?.currentScreeningDate?.toISOString().slice(0, 10);

    const admins = await prisma.user.findMany({
      where: { role: "admin" },
      select: { email: true },
    });
    const adminEmails = admins.map((a) => a.email).filter(Boolean);
    const toEmails = Array.from(
      new Set([lesson.teacher.email, lesson.student.email, ...adminEmails])
    );

    const lessonDateStr = lesson.date.toISOString().slice(0, 10);
    try {
      await sendBookingConfirmation({
        to: toEmails,
        studentName: studentName || "תלמיד",
        teacherName,
        date: lessonDateStr,
        timeRange,
        topic,
        screeningDate,
      });
    } catch (emailErr) {
      console.error("[book/submit] Email send failed:", emailErr);
    }

    return NextResponse.json({
      id: lesson.id,
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
