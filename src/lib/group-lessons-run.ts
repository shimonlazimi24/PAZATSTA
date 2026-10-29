import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { addDaysYYYYMMDD, todayIsraelYYYYMMDD } from "@/lib/dates";
import { isValidDeliveryEmail } from "@/lib/validation";
import { monthLabel, monthRange, noticesDue, teachersWithoutSignup } from "@/lib/group-lessons";
import { emailInfo, lessonDateFromStr } from "@/lib/group-lessons-server";
import { sendGroupLessonDayBefore, sendGroupMissingSignup, sendGroupSignupOpen } from "@/lib/email";

/** Records a monthly notice; false if it was already sent (the unique key decides). */
async function claimNotice(prisma: PrismaClient, monthKey: string, kind: string): Promise<boolean> {
  try {
    await prisma.groupLessonNotice.create({ data: { monthKey, kind } });
    return true;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return false;
    throw e;
  }
}

/**
 * Daily: monthly sign-up notices for next month, and the day-before reminder to
 * each teacher signed up for tomorrow. Safe to run more than once a day.
 */
export async function runGroupLessonNotices(prisma: PrismaClient, todayStr = todayIsraelYYYYMMDD()) {
  const result = { signupOpen: 0, missingSignup: 0, dayBefore: 0 };
  const teachers = (await prisma.user.findMany({ where: { role: "teacher" }, select: { id: true, email: true } })).filter((t) =>
    isValidDeliveryEmail(t.email)
  );

  for (const notice of noticesDue(todayStr)) {
    const { start, end } = monthRange(notice.monthKey);
    const lessons = await prisma.groupLesson.findMany({
      where: { status: "open", date: { gte: start, lt: end } },
      select: { signups: { select: { teacherId: true } } },
    });
    // Nothing to announce until the admin has scheduled next month's lessons.
    if (lessons.length === 0) continue;
    if (!(await claimNotice(prisma, notice.monthKey, notice.kind))) continue;
    try {
      if (notice.kind === "signup_open") {
        await sendGroupSignupOpen(teachers.map((t) => t.email), { monthLabel: monthLabel(notice.monthKey), lessonCount: lessons.length });
        result.signupOpen = teachers.length;
      } else {
        const missing = teachersWithoutSignup(teachers, lessons.flatMap((l) => l.signups.map((s) => s.teacherId)));
        await sendGroupMissingSignup(missing.map((t) => t.email), { monthLabel: monthLabel(notice.monthKey) });
        result.missingSignup = missing.length;
      }
    } catch (e) {
      // Give the claim back so tomorrow's run tries again.
      console.error("[cron/group-lessons] monthly notice failed", notice.monthKey, notice.kind, e);
      await prisma.groupLessonNotice
        .deleteMany({ where: { monthKey: notice.monthKey, kind: notice.kind } })
        .catch((e2) => console.error("[cron/group-lessons] could not release the notice claim", notice.monthKey, notice.kind, e2));
    }
  }

  const tomorrow = lessonDateFromStr(addDaysYYYYMMDD(todayStr, 1));
  const due = await prisma.groupLessonSignup.findMany({
    where: { reminderSentAt: null, groupLesson: { status: "open", date: tomorrow } },
    include: { groupLesson: { include: { type: true } } },
  });
  const emails = new Map(teachers.map((t) => [t.id, t.email]));
  for (const signup of due) {
    const to = emails.get(signup.teacherId);
    if (!to) continue;
    // Claim first so a second run the same day does not send it again.
    const claimed = await prisma.groupLessonSignup.updateMany({
      where: { id: signup.id, reminderSentAt: null },
      data: { reminderSentAt: new Date() },
    });
    if (claimed.count === 0) continue;
    try {
      await sendGroupLessonDayBefore(to, emailInfo(signup.groupLesson));
      result.dayBefore++;
    } catch (e) {
      console.error("[cron/group-lessons] day-before reminder failed", signup.id, e);
      await prisma.groupLessonSignup
        .update({ where: { id: signup.id }, data: { reminderSentAt: null } })
        .catch((e2) => console.error("[cron/group-lessons] could not release the reminder claim", signup.id, e2));
    }
  }
  return result;
}
