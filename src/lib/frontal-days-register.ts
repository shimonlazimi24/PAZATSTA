import type { PrismaClient, FrontalDay } from "@prisma/client";
import { canRegister, renderTemplate } from "@/lib/frontal-days";
import { templateValues } from "@/lib/frontal-days-server";
import { hebrewDateLabel, lessonDateStr } from "@/lib/group-lessons-server";
import { todayIsraelYYYYMMDD } from "@/lib/dates";
import { sendNotice } from "@/lib/email";

/** Registers a teacher with the day row locked, so the last place cannot be taken twice. */
export async function registerTeacherForDay(
  prisma: PrismaClient,
  dayId: string,
  teacherId: string,
  opts: { byAdmin?: boolean } = {}
): Promise<{ ok: true; day: FrontalDay } | { ok: false; message: string; status: number }> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "FrontalDay" WHERE "id" = ${dayId} FOR UPDATE`;
    if (locked.length === 0) return { ok: false, message: "היום לא נמצא", status: 404 } as const;
    const day = await tx.frontalDay.findUniqueOrThrow({ where: { id: dayId }, include: { signups: { select: { teacherId: true } } } });
    const verdict = canRegister({
      status: day.status,
      dateStr: lessonDateStr(day.date),
      todayStr: opts.byAdmin ? "0000-00-00" : todayIsraelYYYYMMDD(),
      teachersNeeded: day.teachersNeeded,
      signedCount: day.signups.length,
      alreadySigned: day.signups.some((s) => s.teacherId === teacherId),
    });
    if (!verdict.ok) return { ok: false, message: verdict.message, status: 409 } as const;
    await tx.frontalDaySignup.create({ data: { dayId, teacherId } });
    const { signups: _signups, ...plain } = day;
    return { ok: true, day: plain } as const;
  });
}

/** The day's message, filled in for this teacher. */
export function sendRegistrationMessage(day: FrontalDay, teacher: { email: string; name: string | null }) {
  const body = renderTemplate(day.messageTemplate, templateValues(day, teacher.name?.trim() || "מדריך/ה"));
  return sendNotice(
    "sendFrontalDayRegistered",
    [teacher.email],
    `נרשמת ליום הפרונטלי ב${day.title}, ${hebrewDateLabel(day.date)}`,
    `יום פרונטלי ב${day.title}`,
    body.split(/\n{2,}/),
    { label: "לפרטי היום ולרשימת ההכנות", path: `/teacher/frontal-days/${day.id}` }
  );
}
