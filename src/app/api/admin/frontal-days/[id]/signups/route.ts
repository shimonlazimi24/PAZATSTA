import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { registerTeacherForDay, sendRegistrationMessage } from "@/lib/frontal-days-register";
import { hebrewDateLabel } from "@/lib/group-lessons-server";
import { sendNotice } from "@/lib/email";

/** Admin assigns a teacher; the teacher gets the same message as on self-registration. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { teacherId?: unknown } | null;
  const teacherId = typeof body?.teacherId === "string" ? body.teacherId : "";
  const teacher = teacherId ? await prisma.user.findFirst({ where: { id: teacherId, role: "teacher" } }) : null;
  if (!teacher) return NextResponse.json({ error: "בחרו מדריך" }, { status: 400 });
  const result = await registerTeacherForDay(prisma, id, teacher.id, { byAdmin: true });
  if (!result.ok) return NextResponse.json({ error: result.message }, { status: result.status });
  await sendRegistrationMessage(result.day, teacher).catch((e) => console.error("[frontal assign] email failed", e));
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const teacherId = new URL(req.url).searchParams.get("teacherId") ?? "";
  const day = await prisma.frontalDay.findUnique({ where: { id } });
  if (!day) return NextResponse.json({ error: "היום לא נמצא" }, { status: 404 });
  const removed = await prisma.frontalDaySignup.deleteMany({ where: { dayId: id, teacherId } });
  if (removed.count === 0) return NextResponse.json({ error: "המדריך לא רשום ליום" }, { status: 404 });
  const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { email: true } });
  if (teacher) {
    await sendNotice("sendFrontalDayRemoved", [teacher.email], `הוסרת מהיום הפרונטלי ב${day.title}`, "הוסרת מיום פרונטלי", [
      `הוסרת מהיום הפרונטלי ב${day.title}, ${hebrewDateLabel(day.date)}.`,
      "אם זו טעות, פנו לשחר.",
    ]).catch((e) => console.error("[frontal remove] email failed", e));
  }
  return NextResponse.json({ ok: true });
}
