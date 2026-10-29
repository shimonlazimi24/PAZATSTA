import type { PrismaClient } from "@prisma/client";
import { todayIsraelYYYYMMDD } from "@/lib/dates";
import { resolveAdminRecipients } from "@/lib/admin";
import { isValidDeliveryEmail } from "@/lib/validation";
import { NO_TEACHER_ALERT_DAYS, noTeacherAlertDue, reminderDue, renderTemplate } from "@/lib/frontal-days";
import { templateValues } from "@/lib/frontal-days-server";
import { hebrewDateLabel, lessonDateFromStr, lessonDateStr } from "@/lib/group-lessons-server";
import { addDaysYYYYMMDD } from "@/lib/dates";
import { sendNotice } from "@/lib/email";

/** Daily: teacher reminders before each day, and an admin warning for days nobody has taken. */
export async function runFrontalDayNotices(prisma: PrismaClient, todayStr = todayIsraelYYYYMMDD()) {
  const result = { reminders: 0, noTeacherAlerts: 0 };
  const horizon = lessonDateFromStr(addDaysYYYYMMDD(todayStr, NO_TEACHER_ALERT_DAYS));
  const days = await prisma.frontalDay.findMany({
    where: { status: "open", date: { gte: lessonDateFromStr(todayStr), lte: horizon } },
    include: { signups: true },
  });

  const teacherIds = Array.from(new Set(days.flatMap((d) => d.signups.map((s) => s.teacherId))));
  const teachers = new Map(
    (await prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, email: true, name: true } })).map((t) => [t.id, t])
  );

  const unstaffed: typeof days = [];
  for (const day of days) {
    const dateStr = lessonDateStr(day.date);
    if (noTeacherAlertDue({ dateStr, todayStr, signedCount: day.signups.length, alreadyAlerted: !!day.noTeacherAlertAt })) {
      const claimed = await prisma.frontalDay.updateMany({ where: { id: day.id, noTeacherAlertAt: null }, data: { noTeacherAlertAt: new Date() } });
      if (claimed.count > 0) unstaffed.push(day);
    }
    for (const signup of day.signups) {
      if (!reminderDue({ dateStr, todayStr, alreadySent: !!signup.reminderSentAt })) continue;
      const claimed = await prisma.frontalDaySignup.updateMany({ where: { id: signup.id, reminderSentAt: null }, data: { reminderSentAt: new Date() } });
      if (claimed.count === 0) continue;
      const teacher = teachers.get(signup.teacherId);
      if (!teacher || !isValidDeliveryEmail(teacher.email)) continue;
      const body = renderTemplate(day.reminderTemplate, templateValues(day, teacher.name?.trim() || "מדריך/ה"));
      try {
        await sendNotice("sendFrontalDayReminder", [teacher.email], `תזכורת: היום הפרונטלי ב${day.title}, ${hebrewDateLabel(day.date)}`, "תזכורת ליום הפרונטלי", body.split(/\n{2,}/), {
          label: "לפרטי היום ולרשימת ההכנות",
          path: `/teacher/frontal-days/${day.id}`,
        });
        result.reminders++;
      } catch (e) {
        console.error("[cron/frontal-days] reminder failed", signup.id, e);
        await prisma.frontalDaySignup
          .update({ where: { id: signup.id }, data: { reminderSentAt: null } })
          .catch((e2) => console.error("[cron/frontal-days] could not release the reminder claim", signup.id, e2));
      }
    }
  }

  if (unstaffed.length > 0) {
    try {
      const admins = await resolveAdminRecipients();
      await sendNotice(
        "sendFrontalNoTeachersAlert",
        admins,
        unstaffed.length === 1 ? `אין מדריכים ליום הפרונטלי ב${unstaffed[0].title}` : `${unstaffed.length} ימים פרונטליים בלי מדריכים`,
        "ימים פרונטליים בלי מדריכים",
        [
          `בשבועיים הקרובים יש ${unstaffed.length === 1 ? "יום פרונטלי שאף מדריך לא נרשם אליו" : `${unstaffed.length} ימים פרונטליים שאף מדריך לא נרשם אליהם`}:`,
          unstaffed.map((d) => `${d.title}, ${hebrewDateLabel(d.date)}`).join("\n"),
        ],
        { label: "לימים הפרונטליים", path: "/admin/frontal-days" }
      );
      result.noTeacherAlerts = unstaffed.length;
    } catch (e) {
      // Give the claims back so tomorrow's run warns again.
      console.error("[cron/frontal-days] no-teacher alert failed", unstaffed.map((d) => d.id), e);
      await prisma.frontalDay
        .updateMany({ where: { id: { in: unstaffed.map((d) => d.id) } }, data: { noTeacherAlertAt: null } })
        .catch((e2) => console.error("[cron/frontal-days] could not release the alert claims", e2));
    }
  }
  return result;
}
