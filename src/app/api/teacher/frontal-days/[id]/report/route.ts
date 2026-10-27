import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-api";
import { resolveAdminRecipients } from "@/lib/admin";
import { todayIsraelYYYYMMDD } from "@/lib/dates";
import { buildReportAnswers } from "@/lib/frontal-days";
import { hebrewDateLabel, lessonDateStr } from "@/lib/group-lessons-server";
import { sendNotice } from "@/lib/email";

/**
 * The closing report: one per day, by a registered teacher, from the day itself.
 * A report the admin returned can be fixed and sent again; an approved one is final.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const me = auth.user;
  const day = await prisma.frontalDay.findUnique({
    where: { id },
    include: { signups: { where: { teacherId: me.id }, select: { id: true } }, report: true },
  });
  if (!day || day.signups.length === 0) return NextResponse.json({ error: "רק מדריך שרשום ליום יכול להגיש דוח" }, { status: 403 });
  if (day.status !== "open") return NextResponse.json({ error: "היום בוטל" }, { status: 409 });
  if (lessonDateStr(day.date) > todayIsraelYYYYMMDD()) return NextResponse.json({ error: "אפשר להגיש את הדוח מיום הפעילות" }, { status: 409 });
  if (day.report && day.report.teacherId !== me.id) return NextResponse.json({ error: "מדריך אחר כבר הגיש את הדוח של היום" }, { status: 409 });
  if (day.report && day.report.status !== "returned") return NextResponse.json({ error: "הדוח כבר הוגש" }, { status: 409 });

  const fields = await prisma.frontalReportField.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const body = (await req.json().catch(() => null)) as { answers?: Record<string, unknown> } | null;
  const built = buildReportAnswers(fields, body?.answers ?? {});
  if (!built.ok) return NextResponse.json({ error: built.message }, { status: 400 });
  const answers = built.answers as unknown as Prisma.InputJsonValue;

  try {
    if (day.report) {
      await prisma.frontalDayReport.update({
        where: { id: day.report.id },
        data: { answers, status: "submitted", submittedAt: new Date() },
      });
    } else {
      await prisma.frontalDayReport.create({ data: { dayId: id, teacherId: me.id, answers } });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "מדריך אחר הגיש את הדוח באותו רגע" }, { status: 409 });
    }
    throw e;
  }

  const admins = await resolveAdminRecipients();
  await sendNotice(
    "sendFrontalReportSubmitted",
    admins,
    `דוח סיום ממתין לאישור: ${day.title}`,
    "דוח סיום ממתין לאישור",
    [`${me.name || me.email} הגיש/ה את דוח הסיום של היום הפרונטלי ב${day.title}, ${hebrewDateLabel(day.date)}.`, "אחרי האישור הדוח נשלח אוטומטית אל המקום."],
    { label: "לאישור הדוח", path: `/admin/frontal-days/${day.id}` }
  ).catch((e) => console.error("[frontal report] admin email failed", e));

  return NextResponse.json({ ok: true }, { status: 201 });
}
