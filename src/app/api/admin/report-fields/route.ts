import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ALWAYS_SHOWN, getAllReportFields, isCustomFieldKey, isReportFieldKey } from "@/lib/report-template";
import { requireAdmin, missingTableResponse } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

/**
 * The lesson-summary questions.
 *
 * Built-in fields (the LessonSummary columns) can be reworded, made required or
 * optional, and hidden; "סיכום כללי" always stays. The admin can also add
 * questions of their own (POST) and delete them (DELETE); their answers are
 * stored with the summary, label included, so old reports keep reading right.
 */
const FieldSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1, "נדרשת כותרת").max(200),
  helpText: z.string().trim().max(500).default(""),
  placeholder: z.string().trim().max(200).default(""),
  isRequired: z.boolean(),
  active: z.boolean().optional(),
});

const PatchSchema = z.object({
  fields: z.array(FieldSchema).min(1).max(60),
});

const NewFieldSchema = z.object({
  label: z.string().trim().min(1, "נדרשת שאלה").max(200),
  helpText: z.string().trim().max(500).default(""),
  placeholder: z.string().trim().max(200).default(""),
  isRequired: z.boolean().default(false),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return NextResponse.json(await getAllReportFields(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "נתוני השדות לא תקינים" },
      { status: 400 }
    );
  }

  const unknown = parsed.data.fields.filter((f) => !isReportFieldKey(f.key) && !isCustomFieldKey(f.key));
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: `שדות לא מוכרים: ${unknown.map((f) => f.key).join(", ")}` },
      { status: 400 }
    );
  }

  // "tips" is satisfied by a selection or by free text, not by a non-empty string,
  // so the required check in the complete route cannot express it.
  if (parsed.data.fields.some((f) => f.key === "tips" && f.isRequired)) {
    return NextResponse.json({ error: "לא ניתן להגדיר את שדה הטיפים כחובה" }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      parsed.data.fields.map((f) => {
        const active = ALWAYS_SHOWN.includes(f.key) ? true : f.active !== false;
        const data = { label: f.label, helpText: f.helpText, placeholder: f.placeholder, isRequired: f.isRequired, active };
        return prisma.reportFieldConfig.upsert({
          where: { key: f.key },
          create: { key: f.key, custom: isCustomFieldKey(f.key), ...data },
          update: data,
        });
      })
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    console.error("[admin/report-fields PATCH]", e);
    return NextResponse.json({ error: "שגיאה בשמירת השדות" }, { status: 500 });
  }
}

/** Adds a question of the admin's own, after the existing ones. */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = NewFieldSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "נתונים לא תקינים" }, { status: 400 });
  }
  const last = await prisma.reportFieldConfig.findFirst({ where: { custom: true }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const created = await prisma.reportFieldConfig.create({
    data: {
      key: `custom_${crypto.randomBytes(6).toString("hex")}`,
      custom: true,
      active: true,
      sortOrder: (last?.sortOrder ?? 0) + 1,
      ...parsed.data,
    },
  });
  return NextResponse.json({ ok: true, key: created.key }, { status: 201 });
}

/** Deletes an added question. Reports that already answered it keep the answer. */
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!isCustomFieldKey(key)) {
    return NextResponse.json({ error: "אפשר למחוק רק שאלה שנוספה. שדה קבוע אפשר להסתיר." }, { status: 400 });
  }
  await prisma.reportFieldConfig.deleteMany({ where: { key, custom: true } });
  return NextResponse.json({ ok: true });
}
