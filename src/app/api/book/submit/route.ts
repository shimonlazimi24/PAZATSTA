import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { sendApprovalRequest } from "@/lib/email";
import { formatDateInIsrael } from "@/lib/date-utils";
import { ADMIN_TEACHER_EMAILS, ADMIN_NOTIFICATION_EMAILS } from "@/lib/admin";

const APPROVAL_WINDOW_MS = 12 * 60 * 60 * 1000; // 12 hours

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
  const isValidDeliveryEmail = (e: string) => {
    const lower = e.toLowerCase().trim();
    if (!lower || !lower.includes("@")) return false;
    if (lower.endsWith(".local") || lower.includes("@localhost")) return false;
    if (/@.*\.(local|test|example)$/i.test(lower)) return false;
    return true;
  };
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
    const availabilityId = typeof body.availabilityId === "string" ? body.availabilityId.trim() : "";
    const teacherId = typeof body.teacherId === "string" ? body.teacherId.trim() : "";
    const selectedTopic = typeof body.selectedTopic === "string" ? body.selectedTopic.trim() : "";
    const studentNameFromForm = typeof body.studentName === "string" ? body.studentName.trim() : "";
    const studentPhoneFromForm = typeof body.phone === "string" ? body.phone.trim() : "";
    const parentNameFromForm = typeof body.parentName === "string" ? body.parentName.trim() : "";
    const parentPhoneFromForm = typeof body.parentPhone === "string" ? body.parentPhone.trim() : "";
    const parentEmailFromForm = typeof body.parentEmail === "string" ? body.parentEmail.trim() : "";
    const notesFromForm = typeof body.notes === "string" ? body.notes.trim() : "";
    const dateStr = typeof body.date === "string" ? body.date.trim() : "";
    const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
    const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";

    let lesson: { id: string; status: string; date: Date; startTime: string; endTime: string; teacher: { email: string; name: string | null }; student: { email: string; name: string | null } };
    let admins: { email: string }[] = [];

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
          if (!specialties.includes(selectedTopic)) {
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
      if (studentNameFromForm || studentPhoneFromForm || parentNameFromForm || parentPhoneFromForm || parentEmailFromForm) {
        const userData: { name?: string; phone?: string } = {};
        if (studentNameFromForm) userData.name = studentNameFromForm;
        if (studentPhoneFromForm) userData.phone = studentPhoneFromForm;
        if (Object.keys(userData).length > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: userData,
          });
        }
        const profileData: { studentFullName?: string; parentFullName?: string; parentPhone?: string; parentEmail?: string } = {};
        if (studentNameFromForm) profileData.studentFullName = studentNameFromForm;
        if (parentNameFromForm) profileData.parentFullName = parentNameFromForm;
        if (parentPhoneFromForm) profileData.parentPhone = parentPhoneFromForm;
        if (parentEmailFromForm) profileData.parentEmail = parentEmailFromForm;
        await prisma.studentProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...profileData },
          update: profileData,
        });
      }
      admins = adminsPreload;
      const adminEmails = admins.map((a) => a.email).filter(Boolean);
      const toEmails = Array.from(
        new Set([lesson.teacher.email, ...adminEmails])
      ).filter(Boolean);
      try {
        await sendApprovalRequest({
          to: toEmails,
          studentName: studentNameFromForm || lesson.student.name || lesson.student.email || "תלמיד",
          studentEmail: lesson.student.email,
          studentPhone: (studentPhoneFromForm || (lesson.student as { phone?: string | null }).phone) ?? null,
          parentName: parentNameFromForm || null,
          parentPhone: parentPhoneFromForm || null,
          parentEmail: parentEmailFromForm || null,
          notes: notesFromForm || null,
          teacherName: lesson.teacher.name || lesson.teacher.email || "מורה",
          date: formatDateInIsrael(lesson.date),
          timeRange: `${lesson.startTime}–${lesson.endTime}`,
        });
      } catch (err) {
        console.error("[book/submit] Approval request email failed:", err);
      }
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
        if (!specialties.includes(selectedTopic)) {
          return NextResponse.json(
            { error: "המורה אינו מתמחה במסלול שנבחר." },
            { status: 403 }
          );
        }
      }
      const existing = await prisma.lesson.findFirst({
        where: { teacherId, date, startTime },
      });
      if (existing) {
        return NextResponse.json(
          { error: "הזמן נתפס, בחר זמן אחר" },
          { status: 409 }
        );
      }
      if (studentNameFromForm || studentPhoneFromForm || parentNameFromForm || parentPhoneFromForm || parentEmailFromForm) {
        const userData: { name?: string; phone?: string } = {};
        if (studentNameFromForm) userData.name = studentNameFromForm;
        if (studentPhoneFromForm) userData.phone = studentPhoneFromForm;
        if (Object.keys(userData).length > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: userData,
          });
        }
        const profileData: { studentFullName?: string; parentFullName?: string; parentPhone?: string; parentEmail?: string } = {};
        if (studentNameFromForm) profileData.studentFullName = studentNameFromForm;
        if (parentNameFromForm) profileData.parentFullName = parentNameFromForm;
        if (parentPhoneFromForm) profileData.parentPhone = parentPhoneFromForm;
        if (parentEmailFromForm) profileData.parentEmail = parentEmailFromForm;
        await prisma.studentProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...profileData },
          update: profileData,
        });
      }
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
    try {
      await sendApprovalRequest({
        to: toEmails,
        studentName,
        studentEmail: lesson.student.email,
        studentPhone: (studentPhoneFromForm || (lesson.student as { phone?: string | null }).phone) ?? null,
        parentName: parentNameFromForm || null,
        parentPhone: parentPhoneFromForm || null,
        parentEmail: parentEmailFromForm || null,
        notes: notesFromForm || null,
        teacherName,
        date: formattedDate,
        timeRange,
      });
    } catch (err) {
      console.error("[book/submit] Approval request email failed:", err);
    }

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
