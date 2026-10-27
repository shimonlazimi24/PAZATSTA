import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { sendApprovalReminder } from "@/lib/email";
import { formatDateInIsrael } from "@/lib/date-utils";
import { isValidDeliveryEmail } from "@/lib/validation";
import { REMINDER_MARKS_HOURS_LEFT, dueReminderMark, hoursLeftLabel } from "@/lib/approval-reminders";

const HOUR_MS = 60 * 60 * 1000;
const CHANNEL = "email";

function israelTimeLabel(d: Date): string {
  const time = d.toLocaleTimeString("he-IL", { timeZone: "Asia/Jerusalem", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${formatDateInIsrael(d)} בשעה ${time}`;
}

/**
 * Sends every approval reminder that is due now. Each reminder is claimed by
 * inserting its row first: the unique key (lesson, mark, channel) means two
 * overlapping runs can never both send it. If sending fails the claim is
 * released, so the next run retries.
 */
export async function sendDueApprovalReminders(prisma: PrismaClient, now = new Date()) {
  const horizon = new Date(now.getTime() + Math.max(...REMINDER_MARKS_HOURS_LEFT) * HOUR_MS);
  const lessons = await prisma.lesson.findMany({
    where: {
      status: "pending_approval",
      // Workshop signups are approved by admins, not by the teacher.
      workshopId: null,
      approvalExpiresAt: { gt: now, lte: horizon },
    },
    select: {
      id: true,
      teacherId: true,
      date: true,
      startTime: true,
      endTime: true,
      topic: true,
      approvalExpiresAt: true,
      teacher: { select: { email: true, name: true } },
      student: { select: { name: true, email: true, studentProfile: { select: { studentFullName: true } } } },
      approvalReminders: { where: { channel: CHANNEL }, select: { mark: true } },
    },
    take: 500,
  });

  let sent = 0;
  let failed = 0;
  for (const lesson of lessons) {
    if (!lesson.approvalExpiresAt) continue;
    const mark = dueReminderMark({
      approvalExpiresAt: lesson.approvalExpiresAt,
      now,
      sentMarks: lesson.approvalReminders.map((r) => r.mark),
    });
    if (mark === null) continue;
    if (!isValidDeliveryEmail(lesson.teacher.email)) continue;

    let claimId: string;
    try {
      const claim = await prisma.approvalReminder.create({
        data: { lessonId: lesson.id, teacherId: lesson.teacherId, mark, channel: CHANNEL },
        select: { id: true },
      });
      claimId = claim.id;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue; // another run has it
      throw e;
    }

    try {
      await sendApprovalReminder({
        to: lesson.teacher.email,
        teacherName: lesson.teacher.name?.trim() || "מדריך/ה",
        studentName:
          lesson.student.studentProfile?.studentFullName?.trim() || lesson.student.name?.trim() || lesson.student.email || "תלמיד",
        date: formatDateInIsrael(lesson.date),
        timeRange: `${lesson.startTime}–${lesson.endTime}`,
        topic: lesson.topic,
        hoursLeft: hoursLeftLabel(lesson.approvalExpiresAt, now),
        expiresAtLabel: israelTimeLabel(lesson.approvalExpiresAt),
      });
      sent++;
    } catch (e) {
      failed++;
      console.error("[approval-reminders] send failed for lesson", lesson.id, (e as Error)?.message ?? e);
      await prisma.approvalReminder.delete({ where: { id: claimId } }).catch(() => {});
    }
  }
  return { checked: lessons.length, sent, failed };
}
