import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, missingTableResponse } from "@/lib/admin-api";
import { todayIsraelYYYYMMDD } from "@/lib/dates";
import { dayStatus, type ReportState } from "@/lib/frontal-days";
import { firstZodMessage, lessonDateFromStr, lessonDateStr } from "@/lib/group-lessons-server";
import { FrontalDayInput, getFrontalDefaults } from "@/lib/frontal-days-server";

export const dynamic = "force-dynamic";

/** All days, upcoming first then past, each with the one thing it needs now. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const today = todayIsraelYYYYMMDD();
    const days = await prisma.frontalDay.findMany({
      orderBy: { date: "asc" },
      include: { signups: { select: { teacherId: true } }, report: { select: { status: true, sentToRecipientAt: true, answers: true, teacherId: true } } },
    });
    const teacherIds = Array.from(new Set(days.flatMap((d) => [...d.signups.map((s) => s.teacherId), ...(d.report ? [d.report.teacherId] : [])])));
    const users = await prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true, email: true } });
    const nameOf = new Map(users.map((u) => [u.id, u.name || u.email]));
    return NextResponse.json(
      days.map((d) => {
        const date = lessonDateStr(d.date);
        return {
          id: d.id,
          title: d.title,
          date,
          startTime: d.startTime,
          endTime: d.endTime,
          address: d.address,
          topic: d.topic,
          teachersNeeded: d.teachersNeeded,
          teachers: d.signups.map((s) => nameOf.get(s.teacherId) ?? "—"),
          status: dayStatus({
            status: d.status,
            dateStr: date,
            todayStr: today,
            teachersNeeded: d.teachersNeeded,
            signedCount: d.signups.length,
            report: (d.report?.status ?? "none") as ReportState,
            sentToRecipient: !!d.report?.sentToRecipientAt,
          }),
          past: date < today,
          report: d.report
            ? {
                status: d.report.status,
                teacherName: nameOf.get(d.report.teacherId) ?? "—",
                answers: Array.isArray(d.report.answers) ? (d.report.answers as { label: string; value: string; internal?: boolean }[]) : [],
              }
            : null,
        };
      }),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    console.error("[admin/frontal-days GET]", e);
    return NextResponse.json({ error: "שגיאה בטעינת הימים" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = FrontalDayInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  const { date, ...rest } = parsed.data;
  if (date < todayIsraelYYYYMMDD()) return NextResponse.json({ error: "התאריך כבר עבר" }, { status: 400 });
  const defaults = await getFrontalDefaults(prisma);
  const created = await prisma.frontalDay.create({
    data: { ...rest, date: lessonDateFromStr(date), ...defaults },
    select: { id: true },
  });
  return NextResponse.json(created, { status: 201 });
}
