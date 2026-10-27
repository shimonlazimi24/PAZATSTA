import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-api";
import { nowIsraelHHMM, todayIsraelYYYYMMDD } from "@/lib/dates";
import { canSignUp, canWithdraw } from "@/lib/group-lessons";
import { lessonDateStr } from "@/lib/group-lessons-server";
import { lockGroupLessonForSignup } from "@/lib/group-lesson-signup";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const me = auth.user.id;
  const result = await prisma.$transaction(async (tx) => {
    const lesson = await lockGroupLessonForSignup(tx, id);
    if (!lesson) return { error: "השיעור לא נמצא", status: 404 } as const;
    const verdict = canSignUp({
      status: lesson.status,
      dateStr: lessonDateStr(lesson.date),
      startTime: lesson.startTime,
      teachersNeeded: lesson.teachersNeeded,
      signedCount: lesson.signups.length,
      alreadySigned: lesson.signups.some((s) => s.teacherId === me),
      todayStr: todayIsraelYYYYMMDD(),
      nowHHMM: nowIsraelHHMM(),
    });
    if (!verdict.ok) return { error: verdict.message, status: 409 } as const;
    await tx.groupLessonSignup.create({ data: { groupLessonId: id, teacherId: me } });
    return { ok: true } as const;
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const lesson = await prisma.groupLesson.findUnique({ where: { id }, select: { date: true } });
  if (!lesson) return NextResponse.json({ error: "השיעור לא נמצא" }, { status: 404 });
  const verdict = canWithdraw({ dateStr: lessonDateStr(lesson.date), todayStr: todayIsraelYYYYMMDD() });
  if (!verdict.ok) return NextResponse.json({ error: verdict.message }, { status: 409 });
  const removed = await prisma.groupLessonSignup.deleteMany({ where: { groupLessonId: id, teacherId: auth.user.id } });
  if (removed.count === 0) return NextResponse.json({ error: "לא נרשמת לשיעור הזה" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
