import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import type { ReportAnswer } from "@/lib/frontal-days";
import { summarizeSurvey } from "@/lib/frontal-survey";

export const dynamic = "force-dynamic";

/** How many students answered a day's survey, out of the class, and what they said. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const day = await prisma.frontalDay.findUnique({ where: { id }, select: { classSize: true } });
  if (!day) return NextResponse.json({ error: "היום לא נמצא" }, { status: 404 });
  const [questions, responses] = await Promise.all([
    prisma.frontalReportField.findMany({ where: { form: "survey", active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.frontalSurveyResponse.findMany({ where: { dayId: id }, orderBy: { createdAt: "asc" }, select: { answers: true } }),
  ]);
  const answers = responses.map((r) => (Array.isArray(r.answers) ? (r.answers as ReportAnswer[]) : []));
  return NextResponse.json(
    { count: responses.length, classSize: day.classSize, questions: summarizeSurvey(questions, answers) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
