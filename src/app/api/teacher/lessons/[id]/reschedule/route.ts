import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import {
  availabilityDateFromYYYYMMDD,
  formatIsraelYYYYMMDD,
  parseYYYYMMDD,
  utcDayBounds,
} from "@/lib/dates";

/** Teacher reschedules a scheduled lesson to a new date/time. Returns old slot to availability. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }

  const { id: lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json({ error: "חסר מזהה שיעור" }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const dateStr = typeof body.date === "string" ? body.date.trim() : "";
    const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
    const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !startTime || !endTime) {
      return NextResponse.json(
        { error: "נדרשים תאריך (YYYY-MM-DD), שעת התחלה ושעת סיום" },
        { status: 400 }
      );
    }

    const newDate = parseYYYYMMDD(dateStr);
    if (!newDate) {
      return NextResponse.json({ error: "תאריך לא תקין" }, { status: 400 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
    });
    if (!lesson) {
      return NextResponse.json({ error: "שיעור לא נמצא" }, { status: 404 });
    }
    if (lesson.teacherId !== user.id) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    if (lesson.status !== "scheduled") {
      return NextResponse.json(
        { error: "ניתן לשנות מועד רק לשיעורים מתוזמנים" },
        { status: 400 }
      );
    }

    const currentDateStr = formatIsraelYYYYMMDD(lesson.date);
    if (currentDateStr === dateStr && lesson.startTime === startTime) {
      return NextResponse.json({ error: "לא בוצע שינוי במועד" }, { status: 400 });
    }

    const targetDay = utcDayBounds(dateStr);
    const oldDayStr = formatIsraelYYYYMMDD(lesson.date);

    await prisma.$transaction(async (tx) => {
      await tx.availability.createMany({
        data: [{
          teacherId: lesson.teacherId,
          date: availabilityDateFromYYYYMMDD(oldDayStr),
          startTime: lesson.startTime,
          endTime: lesson.endTime,
        }],
        skipDuplicates: true,
      });

      const conflictingLesson = await tx.lesson.findFirst({
        where: {
          id: { not: lessonId },
          teacherId: lesson.teacherId,
          workshopId: null,
          startTime,
          status: { notIn: ["canceled"] },
          date: targetDay,
        },
      });
      if (conflictingLesson) {
        throw Object.assign(new Error("SLOT_TAKEN"), { code: "SLOT_TAKEN" });
      }

      await tx.availability.deleteMany({
        where: {
          teacherId: lesson.teacherId,
          startTime,
          date: targetDay,
        },
      });

      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          date: newDate,
          startTime,
          endTime,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as { code?: string };
    if (err?.code === "SLOT_TAKEN") {
      return NextResponse.json(
        { error: "המועד שבחרת תפוס (שיעור אחר או משבצת קיימת)" },
        { status: 409 }
      );
    }
    if (err?.code === "P2002") {
      return NextResponse.json(
        { error: "המועד שבחרת תפוס (שיעור אחר או משבצת קיימת)" },
        { status: 409 }
      );
    }
    console.error("[teacher/lessons/reschedule] Error:", e);
    return NextResponse.json(
      { error: "שגיאה בעדכון המועד" },
      { status: 500 }
    );
  }
}
