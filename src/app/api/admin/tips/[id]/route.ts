import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeTopicKey } from "@/lib/topic-key";
import { MAX_TIP_LENGTH } from "@/lib/report-template";
import { requireAdmin, missingTableResponse } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

/**
 * `slug` is deliberately absent: it is the join key for every historical
 * LessonSummary.tips value, so it is assigned once at creation and never changes.
 * Editing it would silently rewrite what past reports referenced.
 */
const PatchSchema = z.object({
  label: z.string().trim().min(1).max(200).optional(),
  text: z.string().trim().min(1).max(MAX_TIP_LENGTH).optional(),
  groupLabel: z.string().trim().max(200).optional(),
  topics: z.array(z.string().trim().min(1)).max(50).optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
  isArchived: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "נתוני הטיפ לא תקינים" }, { status: 400 });
  }
  const { topics, ...rest } = parsed.data;

  try {
    await prisma.tip.update({
      where: { id },
      data: {
        ...rest,
        ...(topics
          ? { topics: Array.from(new Set(topics.map(normalizeTopicKey).filter(Boolean))) }
          : {}),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "הטיפ לא נמצא" }, { status: 404 });
    }
    console.error("[admin/tips PATCH]", e);
    return NextResponse.json({ error: "שגיאה בשמירת הטיפ" }, { status: 500 });
  }
}

/**
 * Archive rather than delete.
 *
 * A summary written before the snapshot column existed still resolves its text
 * from these rows, so removing one would blank the tips on a report a parent
 * already has. Archiving takes it out of the picker and leaves history intact.
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!id?.trim()) return NextResponse.json({ error: "חסר מזהה" }, { status: 400 });

  try {
    await prisma.tip.update({ where: { id }, data: { isArchived: true } });
    return NextResponse.json({ ok: true, archived: true });
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    if ((e as { code?: string })?.code === "P2025") {
      return NextResponse.json({ error: "הטיפ לא נמצא" }, { status: 404 });
    }
    console.error("[admin/tips DELETE]", e);
    return NextResponse.json({ error: "שגיאה בארכוב הטיפ" }, { status: 500 });
  }
}
