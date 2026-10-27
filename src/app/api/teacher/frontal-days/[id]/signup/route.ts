import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-api";
import { todayIsraelYYYYMMDD } from "@/lib/dates";
import { canWithdraw } from "@/lib/frontal-days";
import { lessonDateStr } from "@/lib/group-lessons-server";
import { registerTeacherForDay, sendRegistrationMessage } from "@/lib/frontal-days-register";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const result = await registerTeacherForDay(prisma, id, auth.user.id);
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  await sendRegistrationMessage(result.day, auth.user).catch((e) => console.error("[frontal register] email failed", e));
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const day = await prisma.frontalDay.findUnique({ where: { id }, select: { date: true } });
  if (!day) return NextResponse.json({ error: "היום לא נמצא" }, { status: 404 });
  const verdict = canWithdraw({ dateStr: lessonDateStr(day.date), todayStr: todayIsraelYYYYMMDD() });
  if (!verdict.ok) return NextResponse.json({ error: verdict.message }, { status: 409 });
  const removed = await prisma.frontalDaySignup.deleteMany({ where: { dayId: id, teacherId: auth.user.id } });
  if (removed.count === 0) return NextResponse.json({ error: "לא נרשמת ליום הזה" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
