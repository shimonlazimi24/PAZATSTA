import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { firstZodMessage } from "@/lib/group-lessons-server";

const Patch = z.object({
  name: z.string().trim().min(1, "הזינו שם").max(150).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

/** Rename, move, reorder or hide a type. Types are never deleted: past lessons point at them. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  try {
    const updated = await prisma.groupLessonType.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") return NextResponse.json({ error: "כבר קיים סוג בשם הזה בקטגוריה" }, { status: 409 });
      if (e.code === "P2025") return NextResponse.json({ error: "הסוג לא נמצא" }, { status: 404 });
    }
    console.error("[admin/group-lesson-types PATCH]", e);
    return NextResponse.json({ error: "שגיאה בשמירה" }, { status: 500 });
  }
}
