import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getReportFields, isReportFieldKey } from "@/lib/report-template";
import { requireAdmin, missingTableResponse } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

/**
 * The wording of the six summary fields.
 *
 * PATCH only. The set of fields mirrors the LessonSummary columns, so creating a
 * seventh row would produce a config nothing renders, and deleting one would drop
 * a field the form needs. Keys are checked against the allowlist in
 * lib/report-template.
 */
const FieldSchema = z.object({
  key: z.string().trim().min(1),
  label: z.string().trim().min(1, "נדרשת כותרת").max(200),
  helpText: z.string().trim().max(500).default(""),
  placeholder: z.string().trim().max(200).default(""),
  isRequired: z.boolean(),
});

const PatchSchema = z.object({
  fields: z.array(FieldSchema).min(1).max(20),
});

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  return NextResponse.json(await getReportFields(), {
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

  const unknown = parsed.data.fields.filter((f) => !isReportFieldKey(f.key));
  if (unknown.length > 0) {
    return NextResponse.json(
      { error: `שדות לא מוכרים: ${unknown.map((f) => f.key).join(", ")}` },
      { status: 400 }
    );
  }

  // "tips" is satisfied by a selection or by free text, not by a non-empty string,
  // so the required check in the complete route cannot express it.
  const tipsRequired = parsed.data.fields.find((f) => f.key === "tips" && f.isRequired);
  if (tipsRequired) {
    return NextResponse.json(
      { error: "לא ניתן להגדיר את שדה הטיפים כחובה" },
      { status: 400 }
    );
  }

  try {
    await prisma.$transaction(
      parsed.data.fields.map((f) =>
        prisma.reportFieldConfig.upsert({
          where: { key: f.key },
          create: {
            key: f.key,
            label: f.label,
            helpText: f.helpText,
            placeholder: f.placeholder,
            isRequired: f.isRequired,
          },
          update: {
            label: f.label,
            helpText: f.helpText,
            placeholder: f.placeholder,
            isRequired: f.isRequired,
          },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    console.error("[admin/report-fields PATCH]", e);
    return NextResponse.json({ error: "שגיאה בשמירת השדות" }, { status: 500 });
  }
}
