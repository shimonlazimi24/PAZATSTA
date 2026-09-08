import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { normalizeTopicKey } from "@/lib/topic-key";
import { MAX_TIP_LENGTH } from "@/lib/report-template";

export const dynamic = "force-dynamic";

export async function requireAdmin(): Promise<{ error: NextResponse } | { ok: true }> {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}

/** A deploy that lands before the migration should say so, not 500. */
export function missingTableResponse(e: unknown): NextResponse | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
    return NextResponse.json(
      { error: "טבלת הטיפים לא קיימת עדיין. הריצו: npx prisma migrate deploy" },
      { status: 503 }
    );
  }
  return null;
}

const TipSchema = z.object({
  label: z.string().trim().min(1, "נדרשת כותרת").max(200),
  text: z.string().trim().min(1, "נדרש תוכן").max(MAX_TIP_LENGTH),
  groupLabel: z.string().trim().max(200).default(""),
  /** Display labels from the picker; stored normalized so spelling drift cannot unmatch them. */
  topics: z.array(z.string().trim().min(1)).max(50).default([]),
});

/** Derive a slug from the label, kept unique. Slugs are immutable once assigned. */
async function uniqueSlug(label: string): Promise<string> {
  const base =
    label
      .trim()
      .toLowerCase()
      // Explicit ranges rather than \p{...}: the project's TS target predates
      // unicode property escapes. Latin, digits and the Hebrew block cover it.
      .replace(/[^a-z0-9\u0590-\u05FF]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "tip";
  let slug = base;
  for (let n = 2; await prisma.tip.findUnique({ where: { slug }, select: { slug: true } }); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const tips = await prisma.tip.findMany({ orderBy: [{ isArchived: "asc" }, { sortOrder: "asc" }] });
    return NextResponse.json(
      tips.map((t) => ({
        id: t.id,
        slug: t.slug,
        label: t.label,
        text: t.text,
        groupLabel: t.groupLabel,
        topics: t.topics,
        sortOrder: t.sortOrder,
        isArchived: t.isArchived,
      })),
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    console.error("[admin/tips GET]", e);
    return NextResponse.json({ error: "שגיאה בטעינת הטיפים" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const parsed = TipSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "נתוני הטיפ לא תקינים" },
      { status: 400 }
    );
  }
  const { label, text, groupLabel, topics } = parsed.data;

  try {
    const last = await prisma.tip.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
    const tip = await prisma.tip.create({
      data: {
        slug: await uniqueSlug(label),
        label,
        text,
        groupLabel,
        topics: Array.from(new Set(topics.map(normalizeTopicKey).filter(Boolean))),
        sortOrder: (last?.sortOrder ?? 0) + 10,
      },
    });
    return NextResponse.json({ id: tip.id, slug: tip.slug });
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    console.error("[admin/tips POST]", e);
    return NextResponse.json({ error: "שגיאה בשמירת הטיפ" }, { status: 500 });
  }
}
