import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { firstZodMessage } from "@/lib/group-lessons-server";
import { fieldSetupProblem } from "@/lib/frontal-days";

const Patch = z.object({
  label: z.string().trim().min(1).max(300).optional(),
  kind: z.enum(["short", "long", "number", "date", "choice", "multi"]).optional(),
  required: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
  help: z.string().trim().max(300).optional(),
  options: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  showIfFieldId: z.string().trim().max(60).nullable().optional(),
  showIfValues: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  internal: z.boolean().optional(),
});

/** Edit, reorder or hide a field. Reports already submitted keep the labels they were filed with. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  const current = await prisma.frontalReportField.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "השדה לא נמצא" }, { status: 404 });
  // Hiding a question needs no checks; anything else is checked as it will be saved.
  const touchesSetup = ["kind", "options", "showIfFieldId", "showIfValues", "active"].some((k) => k in parsed.data) && parsed.data.active !== false;
  if (touchesSetup) {
    const others = await prisma.frontalReportField.findMany({ where: { form: current.form, active: true } });
    const problem = fieldSetupProblem(others, { ...current, ...parsed.data });
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }
  try {
    return NextResponse.json(await prisma.frontalReportField.update({ where: { id }, data: parsed.data }));
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return NextResponse.json({ error: "השדה לא נמצא" }, { status: 404 });
    }
    throw e;
  }
}
