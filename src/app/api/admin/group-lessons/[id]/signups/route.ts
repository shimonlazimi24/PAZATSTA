import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { emailInfo } from "@/lib/group-lessons-server";
import { sendGroupLessonAssigned, sendGroupLessonRemoved } from "@/lib/email";
import { lockGroupLessonForSignup } from "@/lib/group-lesson-signup";

/** Admin assigns a teacher. Capacity still applies: raise "teachers needed" first if it is full. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { teacherId?: unknown } | null;
  const teacherId = typeof body?.teacherId === "string" ? body.teacherId : "";
  const teacher = teacherId
    ? await prisma.user.findFirst({ where: { id: teacherId, role: "teacher" }, select: { id: true, email: true } })
    : null;
  if (!teacher) return NextResponse.json({ error: "בחרו מורה" }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const lesson = await lockGroupLessonForSignup(tx, id);
    if (!lesson) return { error: "השיעור לא נמצא", status: 404 } as const;
    if (lesson.status !== "open") return { error: "השיעור בוטל", status: 400 } as const;
    if (lesson.signups.some((s) => s.teacherId === teacher.id)) return { error: "המורה כבר רשום", status: 409 } as const;
    if (lesson.signups.length >= lesson.teachersNeeded) {
      return { error: "השיעור מלא. הגדילו את מספר המורים הדרוש לפני שמוסיפים", status: 409 } as const;
    }
    await tx.groupLessonSignup.create({ data: { groupLessonId: id, teacherId: teacher.id } });
    return { lesson } as const;
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  await sendGroupLessonAssigned(teacher.email, emailInfo(result.lesson)).catch((e) =>
    console.error("[admin/group-lessons assign] email failed", e)
  );
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const teacherId = new URL(req.url).searchParams.get("teacherId") ?? "";
  const lesson = await prisma.groupLesson.findUnique({ where: { id }, include: { type: true } });
  if (!lesson) return NextResponse.json({ error: "השיעור לא נמצא" }, { status: 404 });
  const removed = await prisma.groupLessonSignup.deleteMany({ where: { groupLessonId: id, teacherId } });
  if (removed.count === 0) return NextResponse.json({ error: "המורה לא רשום לשיעור" }, { status: 404 });
  const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { email: true } });
  if (teacher) {
    await sendGroupLessonRemoved(teacher.email, emailInfo(lesson)).catch((e) =>
      console.error("[admin/group-lessons remove] email failed", e)
    );
  }
  return NextResponse.json({ ok: true });
}
