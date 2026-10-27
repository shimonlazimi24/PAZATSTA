import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-api";
import { missingTableResponse } from "@/lib/admin-api";
import { todayIsraelYYYYMMDD } from "@/lib/dates";
import { lessonDateFromStr, lessonDateStr } from "@/lib/group-lessons-server";

export const dynamic = "force-dynamic";

/** Upcoming days open for registration, and every day this teacher is part of. */
export async function GET() {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const me = auth.user.id;
  const today = todayIsraelYYYYMMDD();
  try {
    const days = await prisma.frontalDay.findMany({
      where: {
        OR: [
          { status: "open", date: { gt: lessonDateFromStr(today) } },
          { signups: { some: { teacherId: me } } },
        ],
      },
      orderBy: { date: "asc" },
      include: {
        signups: { select: { teacherId: true, checklistDone: true } },
        report: { select: { status: true, teacherId: true } },
      },
    });
    return NextResponse.json(
      days.map((d) => {
        const date = lessonDateStr(d.date);
        const mine = d.signups.find((s) => s.teacherId === me);
        return {
          id: d.id,
          title: d.title,
          date,
          startTime: d.startTime,
          endTime: d.endTime,
          address: d.address,
          topic: d.topic,
          status: d.status,
          placesLeft: Math.max(0, d.teachersNeeded - d.signups.length),
          mine: !!mine,
          past: date < today,
          checklistTotal: d.checklist.length,
          checklistDone: mine ? mine.checklistDone.filter((x) => d.checklist.includes(x)).length : 0,
          reportStatus: d.report?.status ?? "none",
        };
      }),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    console.error("[teacher/frontal-days GET]", e);
    return NextResponse.json({ error: "שגיאה בטעינת הימים" }, { status: 500 });
  }
}
