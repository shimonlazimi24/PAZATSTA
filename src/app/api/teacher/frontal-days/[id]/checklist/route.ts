import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-api";

/** Saves which checklist items the teacher has ticked. Only items on the day's list are kept. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { done?: unknown } | null;
  const done = Array.isArray(body?.done) ? body.done.filter((x): x is string => typeof x === "string") : [];
  const day = await prisma.frontalDay.findUnique({ where: { id }, select: { checklist: true } });
  if (!day) return NextResponse.json({ error: "היום לא נמצא" }, { status: 404 });
  const valid = Array.from(new Set(done.filter((x) => day.checklist.includes(x))));
  const updated = await prisma.frontalDaySignup.updateMany({ where: { dayId: id, teacherId: auth.user.id }, data: { checklistDone: valid } });
  if (updated.count === 0) return NextResponse.json({ error: "לא נרשמת ליום הזה" }, { status: 404 });
  return NextResponse.json({ ok: true, done: valid });
}
