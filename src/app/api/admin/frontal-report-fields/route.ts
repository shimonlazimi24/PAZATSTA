import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { firstZodMessage } from "@/lib/group-lessons-server";

export const dynamic = "force-dynamic";

const FieldInput = z
  .object({
    label: z.string().trim().min(1, "הזינו את השאלה").max(300),
    kind: z.enum(["short", "long", "number", "date", "choice", "multi"]),
    required: z.boolean(),
    help: z.string().trim().max(300).optional().default(""),
    options: z.array(z.string().trim().min(1).max(200)).max(30).optional().default([]),
    showIfFieldId: z.string().trim().max(60).nullable().optional().default(null),
    showIfValues: z.array(z.string().trim().min(1).max(200)).max(30).optional().default([]),
    internal: z.boolean().optional().default(false),
  })
  .refine((v) => (v.kind !== "choice" && v.kind !== "multi") || v.options.length >= 2, {
    message: "לשאלת בחירה צריך לפחות שתי אפשרויות",
  });

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const fields = await prisma.frontalReportField.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] });
  return NextResponse.json(fields, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = FieldInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  const last = await prisma.frontalReportField.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const created = await prisma.frontalReportField.create({ data: { ...parsed.data, sortOrder: (last?.sortOrder ?? 0) + 1 } });
  return NextResponse.json(created, { status: 201 });
}
