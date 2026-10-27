import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { firstZodMessage, hebrewDateLabel, lessonDateFromStr, lessonDateStr } from "@/lib/group-lessons-server";
import { FrontalDayInput, TemplatesInput } from "@/lib/frontal-days-server";
import { sendNotice } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const day = await prisma.frontalDay.findUnique({ where: { id }, include: { signups: { orderBy: { createdAt: "asc" } }, report: true } });
  if (!day) return NextResponse.json({ error: "היום לא נמצא" }, { status: 404 });
  const ids = Array.from(new Set([...day.signups.map((s) => s.teacherId), ...(day.report ? [day.report.teacherId] : [])]));
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, phone: true } });
  const userOf = new Map(users.map((u) => [u.id, u]));
  const { signups, report, date, ...rest } = day;
  return NextResponse.json(
    {
      ...rest,
      date: lessonDateStr(date),
      signups: signups.map((s) => ({
        teacherId: s.teacherId,
        name: userOf.get(s.teacherId)?.name || userOf.get(s.teacherId)?.email || "—",
        phone: userOf.get(s.teacherId)?.phone ?? "",
        checklistDone: s.checklistDone.filter((item) => day.checklist.includes(item)),
      })),
      report: report
        ? {
            teacherName: userOf.get(report.teacherId)?.name || userOf.get(report.teacherId)?.email || "—",
            answers: report.answers,
            status: report.status,
            adminNote: report.adminNote,
            submittedAt: report.submittedAt,
            sentToRecipientAt: report.sentToRecipientAt,
          }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/**
 * Three kinds of change: day details, the message/reminder/checklist
 * ({ templates: … }), or canceling ({ status: "canceled" }), which emails the
 * registered teachers.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const day = await prisma.frontalDay.findUnique({ where: { id }, include: { signups: { select: { teacherId: true } } } });
  if (!day) return NextResponse.json({ error: "היום לא נמצא" }, { status: 404 });

  if (body?.status === "canceled") {
    if (day.status !== "canceled") {
      await prisma.frontalDay.update({ where: { id }, data: { status: "canceled" } });
      const teachers = await prisma.user.findMany({ where: { id: { in: day.signups.map((s) => s.teacherId) } }, select: { email: true } });
      await sendNotice(
        "sendFrontalDayCanceled",
        teachers.map((t) => t.email),
        `היום הפרונטלי ב${day.title} בוטל`,
        "היום הפרונטלי בוטל",
        [`היום הפרונטלי ב${day.title}, ${hebrewDateLabel(day.date)}, בוטל.`, "לשאלות פנו לשחר."]
      ).catch((e) => console.error("[frontal cancel] email failed", e));
    }
    return NextResponse.json({ ok: true });
  }

  if (body && "templates" in body) {
    const parsed = TemplatesInput.safeParse(body.templates);
    if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
    await prisma.frontalDay.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ ok: true });
  }

  const parsed = FrontalDayInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  if (parsed.data.teachersNeeded < day.signups.length) {
    return NextResponse.json({ error: `כבר רשומים ${day.signups.length} מדריכים. הסירו מדריך לפני שמקטינים את המספר` }, { status: 400 });
  }
  const { date, ...rest } = parsed.data;
  await prisma.frontalDay.update({ where: { id }, data: { ...rest, date: lessonDateFromStr(date) } });
  return NextResponse.json({ ok: true });
}
