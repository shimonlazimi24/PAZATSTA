import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { isTopicCategory } from "@/lib/booking-topics";
import { ALL_LESSON_TOPIC_LABELS } from "@/data/topics";

export const dynamic = "force-dynamic";

const NewTopic = z.object({
  category: z.string().refine(isTopicCategory, "בחרו קטגוריה"),
  label: z.string().trim().min(2, "כתבו את שם הנושא").max(120),
});
const Patch = z.object({
  id: z.string().min(1),
  active: z.boolean().optional(),
  label: z.string().trim().min(2).max(120).optional(),
  category: z.string().refine(isTopicCategory).optional(),
});

/** Every added topic, shown or hidden, with how many teachers have it as a specialty. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rows = await prisma.bookingTopic.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] });
  const counts = await Promise.all(rows.map((r) => prisma.teacherProfile.count({ where: { specialties: { has: r.label } } })));
  return NextResponse.json(rows.map((r, i) => ({ id: r.id, category: r.category, label: r.label, active: r.active, teachers: counts[i] })), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = NewTopic.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "נתונים לא תקינים" }, { status: 400 });
  const { category, label } = parsed.data;
  if ((ALL_LESSON_TOPIC_LABELS as readonly string[]).includes(label) || (await prisma.bookingTopic.findUnique({ where: { label } }))) {
    return NextResponse.json({ error: "נושא בשם הזה כבר קיים" }, { status: 409 });
  }
  const last = await prisma.bookingTopic.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const created = await prisma.bookingTopic.create({ data: { category, label, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

/** Hide or show a topic, rename it, or move it to another category. */
export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });
  const { id, label, ...rest } = parsed.data;
  const current = await prisma.bookingTopic.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "הנושא לא נמצא" }, { status: 404 });
  if (label && label !== current.label) {
    if ((ALL_LESSON_TOPIC_LABELS as readonly string[]).includes(label) || (await prisma.bookingTopic.findUnique({ where: { label } }))) {
      return NextResponse.json({ error: "נושא בשם הזה כבר קיים" }, { status: 409 });
    }
    // Teachers hold the topic by its name: rename it on them too, so they keep it.
    const holders = await prisma.teacherProfile.findMany({ where: { specialties: { has: current.label } }, select: { id: true, specialties: true } });
    await prisma.$transaction([
      prisma.bookingTopic.update({ where: { id }, data: { label, ...rest } }),
      ...holders.map((h) =>
        prisma.teacherProfile.update({ where: { id: h.id }, data: { specialties: h.specialties.map((s) => (s === current.label ? label : s)) } })
      ),
    ]);
  } else {
    await prisma.bookingTopic.update({ where: { id }, data: rest });
  }
  return NextResponse.json({ ok: true });
}
