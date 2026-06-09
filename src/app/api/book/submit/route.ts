import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { sendApprovalRequest } from "@/lib/email";
import { teacherMatchesTopic } from "@/lib/topics";
import { formatDateInIsrael } from "@/lib/date-utils";
import { ADMIN_TEACHER_EMAILS, ADMIN_NOTIFICATION_EMAILS } from "@/lib/admin";
import { isValidDeliveryEmail } from "@/lib/validation";
import { upsertStudentProfileFromBookingForm } from "@/lib/booking-student-profile";

const APPROVAL_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

const trimString = (s: unknown) => (typeof s === "string" ? s.trim() : "");

const BookSubmitSchema = z.object({
  workshopId: z.unknown().optional().transform(trimString),
  availabilityId: z.unknown().optional().transform(trimString),
  teacherId: z.unknown().optional().transform(trimString),
  selectedTopic: z.unknown().optional().transform(trimString),
  studentName: z.unknown().optional().transform(trimString),
  phone: z.unknown().optional().transform(trimString),
  parentName: z.unknown().optional().transform(trimString),
  parentPhone: z.unknown().optional().transform(trimString),
  parentEmail: z.unknown().optional().transform(trimString),
  notes: z.unknown().optional().transform(trimString),
  date: z.unknown().optional().transform(trimString),
  startTime: z.unknown().optional().transform(trimString),
  endTime: z.unknown().optional().transform(trimString),
}).transform((o) => ({
  workshopId: o.workshopId || "",
  availabilityId: o.availabilityId || "",
  teacherId: o.teacherId || "",
  selectedTopic: o.selectedTopic || "",
  studentNameFromForm: o.studentName || "",
  studentPhoneFromForm: o.phone || "",
  parentNameFromForm: o.parentName || "",
  parentPhoneFromForm: o.parentPhone || "",
  parentEmailFromForm: o.parentEmail || "",
  notesFromForm: o.notes || "",
  dateStr: o.date || "",
  startTime: o.startTime || "",
  endTime: o.endTime || "",
}));

/** Create a lesson as pending_approval; email sent only after teacher/admin approve. */
export async function POST(req: Request) {
  const [user, adminsFromDb, adminTeachersFromDb] = await Promise.all([
    getUserFromSession(),
    prisma.user.findMany({ where: { role: "admin" }, select: { email: true } }),
    ADMIN_TEACHER_EMAILS.length > 0
      ? prisma.user.findMany({
          where: { email: { in: ADMIN_TEACHER_EMAILS } },
          select: { email: true },
        })
      : Promise.resolve([]),
  ]);
  const adminEmailsSet = new Set<string>();
  for (const a of adminsFromDb) if (a.email && isValidDeliveryEmail(a.email)) adminEmailsSet.add(a.email.toLowerCase());
  for (const t of adminTeachersFromDb) if (t.email && isValidDeliveryEmail(t.email)) adminEmailsSet.add(t.email.toLowerCase());
  for (const e of ADMIN_NOTIFICATION_EMAILS) if (isValidDeliveryEmail(e)) adminEmailsSet.add(e.toLowerCase());
  const adminsPreload = Array.from(adminEmailsSet).map((email) => ({ email }));
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const parsed = BookSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "נתוני הבקשה לא תקינים" },
        { status: 400 }
      );
    }
    const {
      workshopId: workshopIdRaw,
      availabilityId,
      teacherId,
      selectedTopic,
      studentNameFromForm,
      studentPhoneFromForm,
      parentNameFromForm,
      parentPhoneFromForm,
      parentEmailFromForm,
      notesFromForm,
      dateStr,
      startTime,
      endTime,
    } = parsed.data;
    const workshopId = workshopIdRaw?.trim() || "";

    if (!workshopId && !notesFromForm?.trim()) {
      return NextResponse.json(
        { error: "נא לציין במה תרצו להתמקד בשיעור (איזה נושאים/מבחנים)" },
        { status: 400 }
      );
    }

    let lesson: { id: string; status: string; date: Date; startTime: string; endTime: string; topic?: string | null; teacher: { email: string; name: string | null }; student: { email: string; name: string | null } };
    let admins: { email: string }[] = [];

    if (workshopId) {
      const w = await prisma.workshop.findUnique({
        where: { id: workshopId },
        include: { teacher: { include: { teacherProfile: true } } },
      });
      if (!w) {
        return NextResponse.json({ error: "הסדנה לא נמצאה" }, { status: 404 });
      }
      const topicLabel = w.topicLabel;
      if (selectedTopic && selectedTopic !== topicLabel) {
        return NextResponse.json({ error: "סוג המיון לא תואם לסדנה" }, { status: 400 });
      }
      const specialties = w.teacher.teacherProfile?.specialties ?? [];
      if (!teacherMatchesTopic(specialties, topicLabel)) {
        return NextResponse.json(
          { error: "המורה אינו משויך למסלול הסדנה. צרו קשר עם האדמין." },
          { status: 403 }
        );
      }
      const booked = await prisma.lesson.count({
        where: { workshopId: w.id, status: { not: "canceled" } },
      });
      if (booked >= w.maxParticipants) {
        return NextResponse.json(
          { error: "אין מקומות פנויים בסדנה זו" },
          { status: 409 }
        );
      }
      const alreadyInWorkshop = await prisma.lesson.findFirst({
        where: {
          workshopId: w.id,
          studentId: user.id,
          status: { not: "canceled" },
        },
      });
      if (alreadyInWorkshop) {
        return NextResponse.json(
          { error: "כבר נרשמת לסדנה זו" },
          { status: 409 }
        );
      }

      await upsertStudentProfileFromBookingForm(user.id, {
        studentNameFromForm,
        studentPhoneFromForm,
        parentNameFromForm,
        parentPhoneFromForm,
        parentEmailFromForm,
      });

      lesson = await prisma.lesson.create({
        data: {
          teacherId: w.teacherId,
          studentId: user.id,
          date: w.date,
          startTime: w.startTime,
          endTime: w.endTime,
          topic: topicLabel,
          workshopId: w.id,
          questionFromStudent: null,
          status: "pending_approval",
          approvalExpiresAt: new Date(Date.now() + APPROVAL_WINDOW_MS),
        },
        include: { teacher: true, student: true },
      });

      admins = adminsPreload;
      const toEmails = admins.map((a) => a.email).filter(Boolean);
      await sendApprovalRequest({
        to: toEmails,
        teacherEmail: lesson.teacher.email,
        studentName: studentNameFromForm || lesson.student.name || lesson.student.email || "תלמיד",
        studentEmail: lesson.student.email,
        studentPhone: (studentPhoneFromForm || (lesson.student as { phone?: string | null }).phone) ?? null,
        parentName: parentNameFromForm || null,
        parentPhone: parentPhoneFromForm || null,
        parentEmail: parentEmailFromForm || null,
        notes: null,
        topic: topicLabel,
        teacherName: lesson.teacher.name || lesson.teacher.email || "מורה",
        date: formatDateInIsrael(lesson.date),
        timeRange: `${lesson.startTime}–${lesson.endTime}`,
      }).catch((err) => console.error("[book/submit] Approval request email failed:", err));

      return NextResponse.json({
        id: lesson.id,
        status: lesson.status,
        date: lesson.date.toISOString().slice(0, 10),
        startTime: lesson.startTime,
        endTime: lesson.endTime,
      });
    }

    if (availabilityId) {
      const result = await prisma.$transaction(
        async (tx) => {
          const current = await tx.availability.findFirst({
            where: { id: availabilityId },
            include: { teacher: { include: { teacherProfile: true } } },
          });
        if (!current) return null;
        if (selectedTopic) {
          const specialties = current.teacher.teacherProfile?.specialties ?? [];
          if (!teacherMatchesTopic(specialties, selectedTopic)) {
            throw new Error("SPECIALIZATION_MISMATCH");
          }
        }
        const created = await tx.lesson.create({
          data: {
            teacherId: current.teacherId,
            studentId: user.id,
            date: current.date,
            startTime: current.startTime,
            endTime: current.endTime,
            topic: selectedTopic || null,
            questionFromStudent: notesFromForm || null,
            status: "pending_approval",
            approvalExpiresAt: new Date(Date.now() + APPROVAL_WINDOW_MS),
          },
          include: { teacher: true, student: true },
        });
        await tx.availability.delete({ where: { id: current.id } });
          return created;
        },
        { timeout: 15_000 }
      );
      if (!result) {
        return NextResponse.json(
          { error: "הזמן נתפס, בחר זמן אחר" },
          { status: 409 }
        );
      }
      lesson = result;
      await upsertStudentProfileFromBookingForm(user.id, {
        studentNameFromForm,
        studentPhoneFromForm,
        parentNameFromForm,
        parentPhoneFromForm,
        parentEmailFromForm,
      });
      admins = adminsPreload;
      const adminEmails = admins.map((a) => a.email).filter(Boolean);
      const toEmails = Array.from(
        new Set([lesson.teacher.email, ...adminEmails])
      ).filter(Boolean);
      await sendApprovalRequest({
        to: toEmails,
        teacherEmail: lesson.teacher.email,
        studentName: studentNameFromForm || lesson.student.name || lesson.student.email || "תלמיד",
        studentEmail: lesson.student.email,
        studentPhone: (studentPhoneFromForm || (lesson.student as { phone?: string | null }).phone) ?? null,
        parentName: parentNameFromForm || null,
        parentPhone: parentPhoneFromForm || null,
        parentEmail: parentEmailFromForm || null,
        notes: notesFromForm || null,
        topic: selectedTopic || lesson.topic || null,
        teacherName: lesson.teacher.name || lesson.teacher.email || "מורה",
        date: formatDateInIsrael(lesson.date),
        timeRange: `${lesson.startTime}–${lesson.endTime}`,
      }).catch((err) => console.error("[book/submit] Approval request email failed:", err));
      return NextResponse.json({
        id: lesson.id,
        status: lesson.status,
        date: lesson.date.toISOString().slice(0, 10),
        startTime: lesson.startTime,
        endTime: lesson.endTime,
      });
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
        include: { teacherProfile: true },
      });
      admins = adminsPreload;
      if (!teacher) {
        return NextResponse.json({ error: "מורה לא נמצא" }, { status: 404 });
      }
      if (selectedTopic) {
        const specialties = teacher.teacherProfile?.specialties ?? [];
        if (!teacherMatchesTopic(specialties, selectedTopic)) {
          return NextResponse.json(
            { error: "המורה אינו מתמחה במסלול שנבחר." },
            { status: 403 }
          );
        }
      }
      const existing = await prisma.lesson.findFirst({
        where: { teacherId, date, startTime, workshopId: null, status: { not: "canceled" } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "הזמן נתפס, בחר זמן אחר" },
          { status: 409 }
        );
      }
      await upsertStudentProfileFromBookingForm(user.id, {
        studentNameFromForm,
        studentPhoneFromForm,
        parentNameFromForm,
        parentPhoneFromForm,
        parentEmailFromForm,
      });
      lesson = await prisma.lesson.create({
        data: {
          teacherId: teacher.id,
          studentId: user.id,
          date,
          startTime,
          endTime,
          topic: selectedTopic || null,
          questionFromStudent: notesFromForm || null,
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
    const adminEmails = admins.map((a) => a.email).filter(Boolean);
    const toEmails = Array.from(
      new Set([lesson.teacher.email, ...adminEmails])
    ).filter(Boolean);
    await sendApprovalRequest({
      to: toEmails,
      teacherEmail: lesson.teacher.email,
      studentName,
      studentEmail: lesson.student.email,
      studentPhone: (studentPhoneFromForm || (lesson.student as { phone?: string | null }).phone) ?? null,
      parentName: parentNameFromForm || null,
      parentPhone: parentPhoneFromForm || null,
      parentEmail: parentEmailFromForm || null,
      notes: notesFromForm || null,
      topic: selectedTopic || lesson.topic || null,
      teacherName,
      date: formattedDate,
      timeRange,
    }).catch((err) => console.error("[book/submit] Approval request email failed:", err));

    return NextResponse.json({
      id: lesson.id,
      status: lesson.status,
      date: lessonDateStr,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "SPECIALIZATION_MISMATCH") {
      return NextResponse.json(
        { error: "המורה אינו מתמחה במסלול שנבחר." },
        { status: 403 }
      );
    }
    const prismaErr = e as { code?: string };
    if (prismaErr?.code === "P2002") {
      return NextResponse.json(
        { error: "הזמן נתפס, בחר זמן אחר" },
        { status: 409 }
      );
    }
    console.error("[book/submit] Failed:", e);
    const message =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "שגיאה בשמירת ההזמנה";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
