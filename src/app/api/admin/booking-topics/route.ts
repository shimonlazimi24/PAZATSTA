import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { TOPIC_CATEGORIES, isTopicCategory } from "@/lib/booking-topics";
import { ALL_LESSON_TOPIC_LABELS } from "@/data/topics";

export const dynamic = "force-dynamic";

const NewTopic = z.object({
  category: z.string().min(1, "בחרו קטגוריה"),
  label: z.string().trim().min(2, "כתבו את שם הנושא").max(120),
});
const NewCategory = z.object({ newCategory: z.string().trim().min(2, "כתבו שם לכרטיס").max(60) });
const Patch = z.object({
  id: z.string().min(1),
  active: z.boolean().optional(),
  label: z.string().trim().min(2).max(120).optional(),
});
const PatchCategory = z.object({
  categoryId: z.string().min(1),
  active: z.boolean().optional(),
  title: z.string().trim().min(2).max(60).optional(),
});

/** A built-in category, or a card the admin added. */
async function categoryExists(id: string): Promise<boolean> {
  return isTopicCategory(id) || (await prisma.bookingCategory.count({ where: { id } })) > 0;
}

/** Every added topic, shown or hidden, with how many teachers have it as a specialty. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const rows = await prisma.bookingTopic.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }] });
  const counts = await Promise.all(rows.map((r) => prisma.teacherProfile.count({ where: { specialties: { has: r.label } } })));
  const categories = await prisma.bookingCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json(
    {
      topics: rows.map((r, i) => ({ id: r.id, category: r.category, label: r.label, active: r.active, teachers: counts[i] })),
      categories: categories.map((c) => ({ id: c.id, title: c.title, active: c.active })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const body = await req.json().catch(() => null);
  // A new card: { newCategory: title }.
  const cat = NewCategory.safeParse(body);
  if (cat.success) {
    const title = cat.data.newCategory;
    if (TOPIC_CATEGORIES.some((c) => c.title === title) || (await prisma.bookingCategory.findUnique({ where: { title } }))) {
      return NextResponse.json({ error: "כרטיס בשם הזה כבר קיים" }, { status: 409 });
    }
    const lastCat = await prisma.bookingCategory.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const created = await prisma.bookingCategory.create({ data: { title, sortOrder: (lastCat?.sortOrder ?? 0) + 1 } });
    return NextResponse.json({ ok: true, categoryId: created.id }, { status: 201 });
  }
  const parsed = NewTopic.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "נתונים לא תקינים" }, { status: 400 });
  const { category, label } = parsed.data;
  if (!(await categoryExists(category))) return NextResponse.json({ error: "בחרו קטגוריה" }, { status: 400 });
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
  const body = await req.json().catch(() => null);
  // A card the admin added: hide/show or rename.
  const cat = PatchCategory.safeParse(body);
  if (cat.success) {
    const { categoryId, title, active } = cat.data;
    if (title && (TOPIC_CATEGORIES.some((c) => c.title === title) || (await prisma.bookingCategory.findFirst({ where: { title, id: { not: categoryId } } })))) {
      return NextResponse.json({ error: "כרטיס בשם הזה כבר קיים" }, { status: 409 });
    }
    const done = await prisma.bookingCategory.updateMany({ where: { id: categoryId }, data: { ...(title ? { title } : {}), ...(active !== undefined ? { active } : {}) } });
    if (done.count === 0) return NextResponse.json({ error: "הכרטיס לא נמצא" }, { status: 404 });
    return NextResponse.json({ ok: true });
  }
  const parsed = Patch.safeParse(body);
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
