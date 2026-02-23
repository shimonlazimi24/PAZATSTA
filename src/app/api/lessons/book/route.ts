import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

const SLOT_TAKEN_ERROR = "הזמן נתפס, בחר זמן אחר";
const APPROVAL_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const availabilityId = typeof body.availabilityId === "string" ? body.availabilityId.trim() : "";
    if (!availabilityId) {
      return NextResponse.json(
        { error: "נא לבחור משבצת זמן" },
        { status: 400 }
      );
    }

    const slot = await prisma.availability.findFirst({
      where: { id: availabilityId },
      include: { teacher: true },
    });
    if (!slot) {
      return NextResponse.json(
        { error: SLOT_TAKEN_ERROR },
        { status: 409 }
      );
    }

    const lesson = await prisma.$transaction(async (tx) => {
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

    if (!lesson) {
      return NextResponse.json(
        { error: SLOT_TAKEN_ERROR },
        { status: 409 }
      );
    }

    const dateStr = lesson.date.toISOString().slice(0, 10);
    const teacherName = lesson.teacher.name || lesson.teacher.email;

    return NextResponse.json({
      id: lesson.id,
      status: lesson.status,
      date: dateStr,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      teacher: { id: lesson.teacher.id, name: teacherName, email: lesson.teacher.email },
    });
  } catch (e) {
    console.error("[lessons/book] Booking failed:", e);
    const message = process.env.NODE_ENV === "development" && e instanceof Error
      ? e.message
      : "שגיאה בקביעת השיעור";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
