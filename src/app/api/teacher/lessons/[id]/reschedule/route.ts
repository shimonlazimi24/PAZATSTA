import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin, resolveAdminRecipients } from "@/lib/admin";
import { sendLessonRescheduled } from "@/lib/email";
import { formatDateInIsrael } from "@/lib/date-utils";
import {
  expirePendingForSlotInTx,
  restoreAvailabilityForLesson,
} from "@/lib/expire-pending-lessons";
import {
  availabilityDateFromYYYYMMDD,
  formatIsraelYYYYMMDD,
  utcDayBounds,
} from "@/lib/dates";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const RescheduleSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    startTime: z.string().regex(TIME, "startTime must be HH:MM"),
    endTime: z.string().regex(TIME, "endTime must be HH:MM"),
  })
  .refine((s) => s.endTime > s.startTime, { message: "endTime must be after startTime" });

/**
 * Move a scheduled lesson to a new date/time and return the old slot to availability.
 *
 * Open to the lesson's own teacher and to admins. Admins previously got a flat 403
 * here, which left no way at all to move a lesson on a customer's behalf.
 */
export async function PATCH(
  req: Request,
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

  const { id: lessonId } = await params;
  if (!lessonId) {
    return NextResponse.json({ error: "חסר מזהה שיעור" }, { status: 400 });
  }

  try {
    const parsed = RescheduleSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "נדרשים תאריך (YYYY-MM-DD) ושעות תקינות (HH:MM), כאשר שעת הסיום מאוחרת מההתחלה" },
        { status: 400 }
      );
    }
    const { date: dateStr, startTime, endTime } = parsed.data;

    // Midnight UTC for the Israel calendar day — the same normalization every other
    // write path uses. Writing noon here (as parseYYYYMMDD does) produced lessons the
    // partial unique index could not compare against ones created by booking, so the
    // double-booking guard silently stopped applying to rescheduled lessons.
    const newDate = availabilityDateFromYYYYMMDD(dateStr);

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
    if (!isAdmin && lesson.teacherId !== user.id) {
      return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
    }
    if (lesson.status !== "scheduled") {
      return NextResponse.json(
        { error: "ניתן לשנות מועד רק לשיעורים מתוזמנים" },
        { status: 400 }
      );
    }

    const oldDayStr = formatIsraelYYYYMMDD(lesson.date);
    const unchanged =
      oldDayStr === dateStr &&
      lesson.startTime === startTime &&
      lesson.endTime === endTime;
    if (unchanged) {
      return NextResponse.json({ error: "לא בוצע שינוי במועד" }, { status: 400 });
    }

    const targetDay = utcDayBounds(dateStr);

    await prisma.$transaction(async (tx) => {
      await restoreAvailabilityForLesson(tx, lesson);

      // Both booking paths do this before their own conflict check; this one did
      // not. A pending_approval lesson whose 24h window has lapsed is still
      // status != 'canceled', so it counted as a conflict and the move failed with
      // "the slot is taken". Nothing cancels those rows except the sweep cron, so
      // the slot stays falsely blocked for at least as long as the gap between
      // cron runs.
      await expirePendingForSlotInTx(tx, lesson.teacherId, dateStr, startTime);

      const conflictingLesson = await tx.lesson.findFirst({
        where: {
          id: { not: lessonId },
          teacherId: lesson.teacherId,
          workshopId: null,
          startTime,
          status: { notIn: ["canceled"] },
          date: targetDay,
        },
        select: { id: true, status: true, date: true },
      });
      if (conflictingLesson) {
        console.warn(
          "[reschedule] blocked lesson=%s -> %s %s by lesson=%s status=%s date=%s",
          lessonId,
          dateStr,
          startTime,
          conflictingLesson.id,
          conflictingLesson.status,
          conflictingLesson.date.toISOString()
        );
        throw Object.assign(new Error("SLOT_TAKEN"), { code: "SLOT_TAKEN" });
      }

      await tx.availability.deleteMany({
        where: { teacherId: lesson.teacherId, startTime, date: targetDay },
      });

      await tx.lesson.update({
        where: { id: lessonId },
        data: { date: newDate, startTime, endTime },
      });
    });

    // Nobody was told the lesson had moved. Notify the people who show up for it.
    const studentName =
      lesson.student.studentProfile?.studentFullName?.trim() ||
      lesson.student.name ||
      lesson.student.email ||
      "תלמיד";
    const parentEmail = lesson.student.studentProfile?.parentEmail?.trim();
    const recipients = [
      lesson.student.email,
      lesson.teacher.email,
      ...(parentEmail ? [parentEmail] : []),
      ...(await resolveAdminRecipients()),
    ];

    try {
      await sendLessonRescheduled({
        to: recipients,
        studentName,
        teacherName: lesson.teacher.name || lesson.teacher.email || "מורה",
        oldDateLabel: formatDateInIsrael(lesson.date),
        oldTimeRange: `${lesson.startTime}–${lesson.endTime}`,
        newDateLabel: formatDateInIsrael(newDate),
        newTimeRange: `${startTime}–${endTime}`,
        topic: lesson.topic,
      });
    } catch (emailErr) {
      // The move already succeeded; a failed notification must not undo it.
      console.error("[teacher/lessons/reschedule] Notification failed:", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const err = e as { code?: string };
    if (err?.code === "SLOT_TAKEN" || err?.code === "P2002") {
      // SLOT_TAKEN means the conflict query matched; P2002 means it did not but the
      // unique index still fired — which would point at a normalization mismatch
      // rather than a genuine clash. They are worth telling apart in the logs.
      console.warn("[reschedule] 409 for lesson=%s cause=%s", lessonId, err.code);
      return NextResponse.json(
        { error: "המועד שבחרת תפוס (שיעור אחר או משבצת קיימת)" },
        { status: 409 }
      );
    }
    console.error("[teacher/lessons/reschedule] Error:", e);
    return NextResponse.json({ error: "שגיאה בעדכון המועד" }, { status: 500 });
  }
}
