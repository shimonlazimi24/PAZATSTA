import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { typeLabel } from "@/lib/group-lessons";
import { GroupLessonInput, emailInfo, firstZodMessage, lessonDateFromStr, lessonDateStr } from "@/lib/group-lessons-server";
import { sendGroupLessonCanceled } from "@/lib/email";

export const dynamic = "force-dynamic";

async function load(id: string) {
  return prisma.groupLesson.findUnique({
    where: { id },
    include: { type: true, signups: { orderBy: { createdAt: "asc" } }, reports: { orderBy: { submittedAt: "asc" } } },
  });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const lesson = await load(id);
  if (!lesson) return NextResponse.json({ error: "השיעור לא נמצא" }, { status: 404 });
  const teacherIds = Array.from(new Set([...lesson.signups.map((s) => s.teacherId), ...lesson.reports.map((r) => r.teacherId)]));
  const users = await prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true, email: true } });
  const nameOf = new Map(users.map((u) => [u.id, u.name || u.email]));
  return NextResponse.json(
    {
      id: lesson.id,
      typeId: lesson.typeId,
      typeLabel: typeLabel(lesson.type),
      date: lessonDateStr(lesson.date),
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      location: lesson.location ?? "",
      details: lesson.details ?? "",
      teachersNeeded: lesson.teachersNeeded,
      status: lesson.status,
      signups: lesson.signups.map((s) => ({ teacherId: s.teacherId, name: nameOf.get(s.teacherId) ?? "—", signedAt: s.createdAt })),
      reports: lesson.reports.map((r) => ({
        teacherId: r.teacherId,
        name: nameOf.get(r.teacherId) ?? "—",
        typeLabel: r.typeLabel,
        participants: r.participants,
        notes: r.notes,
        submittedAt: r.submittedAt,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Edit the lesson's details, or cancel it ({ status: "canceled" }), which emails the signed-up teachers. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const lesson = await load(id);
  if (!lesson) return NextResponse.json({ error: "השיעור לא נמצא" }, { status: 404 });

  if (body?.status === "canceled") {
    if (lesson.status === "canceled") return NextResponse.json({ ok: true });
    await prisma.groupLesson.update({ where: { id }, data: { status: "canceled" } });
    const teachers = await prisma.user.findMany({ where: { id: { in: lesson.signups.map((s) => s.teacherId) } }, select: { email: true } });
    await sendGroupLessonCanceled(teachers.map((t) => t.email), emailInfo(lesson)).catch((e) =>
      console.error("[admin/group-lessons cancel] email failed", e)
    );
    return NextResponse.json({ ok: true });
  }

  const parsed = GroupLessonInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  const v = parsed.data;
  if (v.teachersNeeded < lesson.signups.length) {
    return NextResponse.json(
      { error: `כבר רשומים ${lesson.signups.length} מדריכים. הסירו מדריך לפני שמקטינים את המספר` },
      { status: 400 }
    );
  }
  await prisma.groupLesson.update({
    where: { id },
    data: {
      typeId: v.typeId,
      date: lessonDateFromStr(v.date),
      startTime: v.startTime,
      endTime: v.endTime,
      location: v.location || null,
      details: v.details || null,
      teachersNeeded: v.teachersNeeded,
    },
  });
  return NextResponse.json({ ok: true });
}
