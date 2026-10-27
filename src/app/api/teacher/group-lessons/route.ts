import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-api";
import { missingTableResponse } from "@/lib/admin-api";
import { nowIsraelHHMM, todayIsraelYYYYMMDD } from "@/lib/dates";
import { canWithdraw, hasStarted, isMonthKey, monthKeyOf, monthRange, nextMonthKey, typeLabel } from "@/lib/group-lessons";
import { lessonDateStr } from "@/lib/group-lessons-server";

export const dynamic = "force-dynamic";

/**
 * What a teacher sees: the lessons of a month (open ones, plus any they are in),
 * whether they have met the monthly requirement for this month and next, and
 * past lessons still waiting for their report.
 */
export async function GET(req: Request) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const me = auth.user.id;
  const today = todayIsraelYYYYMMDD();
  const now = nowIsraelHHMM();
  const thisMonth = monthKeyOf(today);
  const monthParam = new URL(req.url).searchParams.get("month");
  const month = isMonthKey(monthParam) ? monthParam : thisMonth;
  const { start, end } = monthRange(month);

  try {
    const [lessons, mySignups, types] = await Promise.all([
      prisma.groupLesson.findMany({
        where: { date: { gte: start, lt: end }, OR: [{ status: "open" }, { signups: { some: { teacherId: me } } }] },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: { type: true, signups: { select: { teacherId: true } }, reports: { where: { teacherId: me }, select: { id: true } } },
      }),
      prisma.groupLessonSignup.findMany({
        where: { teacherId: me, groupLesson: { status: "open" } },
        include: { groupLesson: { include: { type: true, reports: { where: { teacherId: me }, select: { id: true } } } } },
      }),
      prisma.groupLessonType.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }),
    ]);

    const signedMonths = new Set(mySignups.map((s) => monthKeyOf(lessonDateStr(s.groupLesson.date))));
    const awaitingReport = mySignups
      .filter((s) => {
        const d = lessonDateStr(s.groupLesson.date);
        return hasStarted(d, s.groupLesson.startTime, today, now) && s.groupLesson.reports.length === 0;
      })
      .map((s) => ({
        id: s.groupLesson.id,
        date: lessonDateStr(s.groupLesson.date),
        startTime: s.groupLesson.startTime,
        typeLabel: typeLabel(s.groupLesson.type),
      }));

    return NextResponse.json(
      {
        month,
        requirement: [thisMonth, nextMonthKey(thisMonth)].map((m) => ({ month: m, met: signedMonths.has(m) })),
        awaitingReport,
        types: types.map((t) => ({ id: t.id, label: typeLabel(t) })),
        lessons: lessons.map((l) => {
          const date = lessonDateStr(l.date);
          const mine = l.signups.some((s) => s.teacherId === me);
          const started = hasStarted(date, l.startTime, today, now);
          return {
            id: l.id,
            date,
            startTime: l.startTime,
            endTime: l.endTime,
            location: l.location,
            details: l.details,
            typeId: l.typeId,
            typeLabel: typeLabel(l.type),
            status: l.status,
            placesLeft: Math.max(0, l.teachersNeeded - l.signups.length),
            teachersNeeded: l.teachersNeeded,
            mine,
            started,
            canWithdraw: mine && !started && canWithdraw({ dateStr: date, todayStr: today }).ok,
            reported: l.reports.length > 0,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    console.error("[teacher/group-lessons GET]", e);
    return NextResponse.json({ error: "שגיאה בטעינת השיעורים" }, { status: 500 });
  }
}
