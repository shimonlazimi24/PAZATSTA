import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendScreeningFollowUpReminder } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

/** Run daily: find lessons with completed report where student's screening date is today;
 *  send reminder to teacher; set followUpReminderSentAt on StudentProfile to avoid duplicates. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  for (const lesson of lessons) {
    const profile = lesson.student.studentProfile;
    if (!profile?.currentScreeningDate) continue;
    if (profile.followUpReminderSentAt && profile.followUpReminderSentAt >= startOfToday) continue;
    const screeningDateStr = profile.currentScreeningDate.toISOString().slice(0, 10);
    const lastLessonDate = lesson.date.toISOString().slice(0, 10);
    const studentName = lesson.student.name || lesson.student.email;
    const screeningType = profile.currentScreeningType ?? "—";

    try {
      await sendScreeningFollowUpReminder({
        to: lesson.teacher.email,
        studentName,
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
