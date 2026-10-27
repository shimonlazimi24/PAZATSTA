import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, missingTableResponse } from "@/lib/admin-api";
import { firstZodMessage } from "@/lib/group-lessons-server";

export const dynamic = "force-dynamic";

const NewType = z.object({
  category: z.string().trim().min(1, "בחרו קטגוריה").max(100),
  name: z.string().trim().min(1, "הזינו שם").max(150),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const types = await prisma.groupLessonType.findMany({
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { lessons: true } } },
    });
    return NextResponse.json(
      types.map((t) => ({ id: t.id, category: t.category, name: t.name, sortOrder: t.sortOrder, active: t.active, lessonCount: t._count.lessons })),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    console.error("[admin/group-lesson-types GET]", e);
    return NextResponse.json({ error: "שגיאה בטעינת הסוגים" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = NewType.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  const { category, name } = parsed.data;
  try {
    const last = await prisma.groupLessonType.findFirst({ where: { category }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const created = await prisma.groupLessonType.create({ data: { category, name, sortOrder: (last?.sortOrder ?? 0) + 1 } });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "כבר קיים סוג בשם הזה בקטגוריה" }, { status: 409 });
    }
    console.error("[admin/group-lesson-types POST]", e);
    return NextResponse.json({ error: "שגיאה בשמירה" }, { status: 500 });
  }
}
