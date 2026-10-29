import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { todayIsraelYYYYMMDD } from "@/lib/dates";
import { buildReportAnswers } from "@/lib/frontal-days";
import { surveyOpen } from "@/lib/frontal-survey";
import { hebrewDateLabel, lessonDateStr } from "@/lib/group-lessons-server";

export const dynamic = "force-dynamic";

/** The browser's survey key: the same phone answers a day's survey only once. */
const COOKIE = "svy";
/** A ceiling per day, so a leaked link cannot fill the table. */
const MAX_RESPONSES_PER_DAY = 500;

const questionsOf = () =>
  prisma.frontalReportField.findMany({ where: { form: "survey", active: true }, orderBy: { sortOrder: "asc" } });

function readKey(req: Request): string | null {
  const m = (req.headers.get("cookie") ?? "").match(/(?:^|;\s*)svy=([A-Za-z0-9_-]{16,64})/);
  return m ? m[1] : null;
}

async function loadDay(dayId: string) {
  return prisma.frontalDay.findUnique({ where: { id: dayId }, select: { id: true, title: true, date: true, status: true, classSize: true } });
}

/** Public: the questions of one day's survey. No login. */
export async function GET(req: Request, { params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const day = await loadDay(dayId);
  if (!day) return NextResponse.json({ error: "הסקר לא נמצא" }, { status: 404 });
  const dateStr = lessonDateStr(day.date);
  const open = surveyOpen({ dateStr, todayStr: todayIsraelYYYYMMDD(), status: day.status });
  const key = readKey(req);
  const answered = key ? (await prisma.frontalSurveyResponse.count({ where: { dayId, clientKey: key } })) > 0 : false;
  const questions = open && !answered ? await questionsOf() : [];
  return NextResponse.json(
    {
      title: day.title,
      dateLabel: hebrewDateLabel(day.date),
      open,
      answered,
      questions: questions.map((q) => ({
        id: q.id,
        label: q.label,
        kind: q.kind,
        required: q.required,
        help: q.help,
        options: q.options,
        showIfFieldId: q.showIfFieldId,
        showIfValues: q.showIfValues,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** Public: one student's answers. */
export async function POST(req: Request, { params }: { params: Promise<{ dayId: string }> }) {
  const { dayId } = await params;
  const day = await loadDay(dayId);
  if (!day) return NextResponse.json({ error: "הסקר לא נמצא" }, { status: 404 });
  if (!surveyOpen({ dateStr: lessonDateStr(day.date), todayStr: todayIsraelYYYYMMDD(), status: day.status })) {
    return NextResponse.json({ error: "הסקר סגור" }, { status: 409 });
  }
  const body = (await req.json().catch(() => null)) as { answers?: unknown } | null;
  const input = body?.answers && typeof body.answers === "object" && !Array.isArray(body.answers) ? (body.answers as Record<string, unknown>) : {};
  const built = buildReportAnswers(await questionsOf(), input);
  if (!built.ok) return NextResponse.json({ error: built.message }, { status: 400 });
  // Optional questions left blank still produce an answer with an empty value.
  if (built.answers.every((a) => !a.value)) return NextResponse.json({ error: "נא לענות לפחות על שאלה אחת" }, { status: 400 });

  // A class answers at most about twice its size; a leaked link cannot fill the table.
  const cap = day.classSize ? Math.min(MAX_RESPONSES_PER_DAY, day.classSize * 2 + 10) : MAX_RESPONSES_PER_DAY;
  if ((await prisma.frontalSurveyResponse.count({ where: { dayId } })) >= cap) {
    return NextResponse.json({ error: "הסקר מלא" }, { status: 409 });
  }
  const key = readKey(req) ?? randomBytes(18).toString("base64url");
  try {
    await prisma.frontalSurveyResponse.create({ data: { dayId, clientKey: key, answers: built.answers } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "כבר ענית על הסקר הזה. תודה!", code: "already_answered" }, { status: 409 });
    }
    throw e;
  }
  const res = NextResponse.json({ ok: true }, { status: 201 });
  res.cookies.set(COOKIE, key, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
