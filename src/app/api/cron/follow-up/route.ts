import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendScreeningFollowUpReminder } from "@/lib/email";
import { validateCronAuth } from "@/lib/cron-auth";

/** Run daily: find lessons with completed report where student's screening date is today;
 *  send reminder to teacher; set followUpReminderSentAt on StudentProfile to avoid duplicates. */
export async function GET(req: Request) {
  const authError = validateCronAuth(req);
  if (authError) return authError;

  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const lessons = await prisma.lesson.findMany({
    where: {
      status: "completed",
      summary: { isNot: null },
      student: {
        studentProfile: {
          currentScreeningDate: { gte: startOfToday, lt: endOfToday },
        },
      },
    },
    include: {
      teacher: true,
      student: { include: { studentProfile: true } },
      summary: true,
    },
  });

  let sent = 0;
  // followUpReminderSentAt is read from rows loaded before the loop, so updating it
  // mid-loop does not stop a second lesson for the same student from sending again.
  // Track what this run has already handled.
  const handledProfileIds = new Set<string>();

  for (const lesson of lessons) {
    const profile = lesson.student.studentProfile;
    if (!profile?.currentScreeningDate) continue;
    if (handledProfileIds.has(profile.id)) continue;
    if (profile.followUpReminderSentAt && profile.followUpReminderSentAt >= startOfToday) continue;
    handledProfileIds.add(profile.id);
    const screeningDateStr = profile.currentScreeningDate.toISOString().slice(0, 10);
    const lastLessonDate = lesson.date.toISOString().slice(0, 10);
    const studentName = lesson.student.name || lesson.student.email;
    const studentPhone = lesson.student.phone ?? null;
    const screeningType = profile.currentScreeningType ?? "—";

    try {
      await sendScreeningFollowUpReminder({
        to: lesson.teacher.email,
        studentName,
        studentPhone,
        screeningType,
        screeningDate: screeningDateStr,
        lastLessonDate,
      });
      await prisma.studentProfile.update({
        where: { id: profile.id },
        data: { followUpReminderSentAt: new Date() },
      });
      sent++;
    } catch (e) {
      console.error("[cron/follow-up] Failed for lesson", lesson.id, e);
    }
  }

  return NextResponse.json({ ok: true, remindersSent: sent });
}
