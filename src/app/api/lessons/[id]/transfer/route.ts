import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { sendNotice } from "@/lib/email";
import { formatDateInIsrael } from "@/lib/date-utils";
import { expirePendingForSlotInTx, restoreAvailabilityForLesson } from "@/lib/expire-pending-lessons";
import { formatIsraelYYYYMMDD } from "@/lib/dates";
import { teacherMatchesTopic } from "@/lib/topics";
import { teachersAllowed } from "@/lib/teacher-permissions";
import { isPhoneOnlyEmail } from "@/lib/phone-only";
import { isValidDeliveryEmail } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Admin moves a private lesson to another teacher, same date and time, instead
 * of canceling it when the teacher cannot come. The old teacher's slot returns
 * to their availability, the new teacher's matching slot is taken, and the old
 * teacher, the new teacher and the student are told.
 */

async function requireAdminUser() {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) return null;
  return user;
}

function loadLesson(id: string) {
  return prisma.lesson.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, email: true, name: true } },
      student: { select: { email: true, name: true, studentProfile: { select: { parentEmail: true, studentFullName: true } } } },
    },
  });
}

/** Teachers who could take the lesson: allowed for private lessons, teach the topic, and are free then. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  const { id } = await params;
  const lesson = await loadLesson(id);
  if (!lesson || lesson.workshopId) return NextResponse.json({ error: "השיעור לא נמצא" }, { status: 404 });

  const [teachers, busy] = await Promise.all([
    prisma.user.findMany({
      where: { role: "teacher", id: { not: lesson.teacherId }, ...teachersAllowed("private") },
      select: { id: true, name: true, email: true, teacherProfile: { select: { displayName: true, specialties: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.lesson.findMany({
      where: { date: lesson.date, startTime: lesson.startTime, workshopId: null, status: { not: "canceled" }, id: { not: id } },
      select: { teacherId: true },
    }),
  ]);
  const busyIds = new Set(busy.map((b) => b.teacherId));
  return NextResponse.json({
    teachers: teachers.map((t) => ({
      id: t.id,
      name: t.teacherProfile?.displayName || t.name || t.email,
      teachesTopic: lesson.topic ? teacherMatchesTopic(t.teacherProfile?.specialties ?? [], lesson.topic) : true,
      busy: busyIds.has(t.id),
    })),
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdminUser())) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { teacherId?: unknown } | null;
  const newTeacherId = typeof body?.teacherId === "string" ? body.teacherId : "";
  const lesson = await loadLesson(id);
  if (!lesson || lesson.workshopId) return NextResponse.json({ error: "השיעור לא נמצא" }, { status: 404 });
  if (lesson.status !== "scheduled" && lesson.status !== "pending_approval") {
    return NextResponse.json({ error: "אפשר להעביר רק שיעור שמחכה לאישור או שנקבע" }, { status: 409 });
  }
  if (newTeacherId === lesson.teacherId) return NextResponse.json({ error: "זה כבר המורה של השיעור" }, { status: 400 });
  const newTeacher = await prisma.user.findFirst({
    where: { id: newTeacherId, role: "teacher", ...teachersAllowed("private") },
    select: { id: true, email: true, name: true, teacherProfile: { select: { displayName: true } } },
  });
  if (!newTeacher) return NextResponse.json({ error: "המורה לא נמצא או שאינו מלמד שיעורים פרטיים" }, { status: 400 });

  const dateStr = formatIsraelYYYYMMDD(lesson.date);
  try {
    await prisma.$transaction(async (tx) => {
      // A lapsed pending request of the new teacher at that time does not block the move.
      await expirePendingForSlotInTx(tx, newTeacher.id, dateStr, lesson.startTime);
      const clash = await tx.lesson.findFirst({
        where: { teacherId: newTeacher.id, date: lesson.date, startTime: lesson.startTime, workshopId: null, status: { not: "canceled" } },
        select: { id: true },
      });
      if (clash) throw Object.assign(new Error("BUSY"), { code: "BUSY" });
      await restoreAvailabilityForLesson(tx, lesson);
      await tx.availability.deleteMany({ where: { teacherId: newTeacher.id, date: lesson.date, startTime: lesson.startTime } });
      await tx.lesson.update({ where: { id }, data: { teacherId: newTeacher.id } });
    });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === "BUSY") return NextResponse.json({ error: "למורה הזה כבר יש שיעור באותה שעה" }, { status: 409 });
    // The unique (teacher, date, start) also counts a canceled lesson at that time.
    if (code === "P2002") return NextResponse.json({ error: "למורה הזה כבר רשום שיעור (גם אם בוטל) באותה שעה" }, { status: 409 });
    console.error("[lessons/transfer]", e);
    return NextResponse.json({ error: "ההעברה נכשלה" }, { status: 500 });
  }

  const when = `${formatDateInIsrael(lesson.date)}, ${lesson.startTime}–${lesson.endTime}`;
  const studentName = lesson.student.studentProfile?.studentFullName?.trim() || lesson.student.name || "תלמיד";
  const newName = newTeacher.teacherProfile?.displayName || newTeacher.name || "המורה";
  const topic = lesson.topic ? ` (${lesson.topic})` : "";
  const studentTo = [
    ...(isPhoneOnlyEmail(lesson.student.email) ? [] : [lesson.student.email]),
    ...(lesson.student.studentProfile?.parentEmail ? [lesson.student.studentProfile.parentEmail] : []),
  ].filter(isValidDeliveryEmail);
  const pending = lesson.status === "pending_approval";
  await Promise.allSettled([
    sendNotice("sendLessonTransferredOldTeacher", [lesson.teacher.email].filter(isValidDeliveryEmail), "השיעור הועבר למורה אחר", "השיעור הועבר", [
      `השיעור עם ${studentName} ב${when}${topic} הועבר ל${newName}.`,
      "אין צורך לעשות דבר. השעה חזרה לזמינות שלך.",
    ]),
    sendNotice(
      "sendLessonTransferredNewTeacher",
      [newTeacher.email].filter(isValidDeliveryEmail),
      "שובץ לך שיעור חדש",
      "שובץ לך שיעור",
      [`שובץ לך שיעור עם ${studentName} ב${when}${topic}.`, pending ? "השיעור ממתין לאישור שלך." : "השיעור כבר מאושר."],
      { label: "לשיעורים שלי", path: "/teacher/dashboard" }
    ),
    sendNotice("sendLessonTransferredStudent", studentTo, "עדכון: מורה אחר יעביר את השיעור", "המורה של השיעור התחלף", [
      `השיעור של ${studentName} ב${when}${topic} יועבר על ידי ${newName}.`,
      "המועד נשאר בדיוק אותו מועד.",
    ]),
  ]);
  return NextResponse.json({ ok: true });
}
