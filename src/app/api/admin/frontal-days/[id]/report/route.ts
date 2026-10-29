import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { hebrewDateLabel } from "@/lib/group-lessons-server";
import { sendNotice } from "@/lib/email";
import { answersForRecipient, type ReportAnswer } from "@/lib/frontal-days";
import { summarizeSurvey, surveyRatio } from "@/lib/frontal-survey";


/**
 * The closing report: edit its wording, approve it and send it to the school,
 * send it again after an edit, or return it to the teacher with a note.
 * Approving twice does not resend; "resend" does, on purpose.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { action?: unknown; note?: unknown; answers?: unknown; includeSurvey?: unknown } | null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const day = await prisma.frontalDay.findUnique({ where: { id }, include: { report: true } });
  if (!day?.report) return NextResponse.json({ error: "עוד לא הוגש דוח ליום הזה" }, { status: 404 });
  const report = day.report;

  if (body?.action === "return") {
    if (!note) return NextResponse.json({ error: "כתבו למדריך מה לתקן" }, { status: 400 });
    if (report.status !== "submitted") return NextResponse.json({ error: "אפשר להחזיר למדריך רק דוח שממתין לאישור" }, { status: 409 });
    await prisma.frontalDayReport.update({ where: { id: report.id }, data: { status: "returned", adminNote: note } });
    const teacher = await prisma.user.findUnique({ where: { id: report.teacherId }, select: { email: true } });
    if (teacher) {
      await sendNotice("sendFrontalReportReturned", [teacher.email], `דוח הסיום של ${day.title} הוחזר לתיקון`, "הדוח הוחזר לתיקון", [
        `שחר החזיר את דוח הסיום של היום ב${day.title} עם ההערה:`,
        note,
      ], { label: "לתיקון הדוח", path: `/teacher/frontal-days/${day.id}` }).catch((e) => console.error("[frontal report return] email failed", e));
    }
    return NextResponse.json({ ok: true });
  }

  if (body?.action === "edit") {
    // The admin's own wording: values (and the internal mark) change, the questions stay.
    const stored = (Array.isArray(report.answers) ? report.answers : []) as ReportAnswer[];
    const incoming = Array.isArray(body.answers) ? body.answers : null;
    if (!incoming || incoming.length !== stored.length) return NextResponse.json({ error: "הדוח השתנה בינתיים. רעננו את הדף" }, { status: 409 });
    const edited: ReportAnswer[] = [];
    for (let i = 0; i < stored.length; i++) {
      const a = incoming[i] as { value?: unknown; internal?: unknown } | null;
      const value = typeof a?.value === "string" ? a.value.trim() : "";
      if (value.length > 4000) return NextResponse.json({ error: `${stored[i].label}: הטקסט ארוך מדי` }, { status: 400 });
      edited.push({ label: stored[i].label, value, ...(a?.internal === true ? { internal: true } : {}) });
    }
    await prisma.frontalDayReport.update({ where: { id: report.id }, data: { answers: edited } });
    return NextResponse.json({ ok: true });
  }

  const includeSurvey = body?.includeSurvey === true;
  if (body?.action === "resend") {
    if (report.status !== "approved") return NextResponse.json({ error: "אפשר לשלוח מחדש רק דוח שאושר" }, { status: 409 });
    if (!day.recipientEmail) return NextResponse.json({ error: "חסרה כתובת המייל של מקבל הדוח. הוסיפו אותה בפרטי היום" }, { status: 400 });
    await sendToRecipient(day, report.answers, includeSurvey);
    await prisma.frontalDayReport.update({ where: { id: report.id }, data: { sentToRecipientAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  if (body?.action !== "approve") return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
  if (report.status !== "submitted" && report.status !== "approved") {
    return NextResponse.json({ error: "הדוח הוחזר למדריך ועוד לא הוגש מחדש" }, { status: 409 });
  }
  if (!day.recipientEmail) {
    return NextResponse.json({ error: "חסרה כתובת המייל של מקבל הדוח. הוסיפו אותה בפרטי היום" }, { status: 400 });
  }
  if (report.sentToRecipientAt) return NextResponse.json({ ok: true, alreadySent: true });

  await sendToRecipient(day, report.answers, includeSurvey);
  await prisma.frontalDayReport.update({
    where: { id: report.id },
    data: { status: "approved", approvedAt: new Date(), sentToRecipientAt: new Date(), adminNote: note || report.adminNote },
  });
  return NextResponse.json({ ok: true });
}

type DayForEmail = { id: string; title: string; date: Date; topic: string; recipientName: string; recipientEmail: string; classSize: number | null };

/**
 * Emails the closing summary to the school. Internal answers (the instructor's
 * self-review, notes on the school's teacher, suggestions for Pazatsta) stay
 * with Pazatsta. Optionally adds how many students answered the survey and the
 * multiple-choice results, never their free-text answers.
 */
async function sendToRecipient(day: DayForEmail, rawAnswers: unknown, includeSurvey: boolean) {
  const answers = answersForRecipient((Array.isArray(rawAnswers) ? rawAnswers : []) as ReportAnswer[]);
  const surveyLines: string[] = [];
  if (includeSurvey) {
    const [questions, responses] = await Promise.all([
      prisma.frontalReportField.findMany({ where: { form: "survey", active: true }, orderBy: { sortOrder: "asc" } }),
      prisma.frontalSurveyResponse.findMany({ where: { dayId: day.id }, select: { answers: true } }),
    ]);
    if (responses.length > 0) {
      surveyLines.push(`סקר המשוב של התלמידים: ${surveyRatio(responses.length, day.classSize)}`);
      const summary = summarizeSurvey(questions, responses.map((r) => (Array.isArray(r.answers) ? (r.answers as ReportAnswer[]) : [])));
      for (const q of summary) {
        if (q.kind === "choice" && q.answered > 0) {
          surveyLines.push(`${q.label}\n${q.counts.filter((c) => c.count > 0).map((c) => `${c.option}: ${Math.round((c.count / q.answered) * 100)}%`).join("\n")}`);
        } else if (q.kind === "number" && q.average !== null) {
          surveyLines.push(`${q.label}: ממוצע ${q.average}`);
        }
      }
    }
  }
  const greeting = day.recipientName ? `שלום ${day.recipientName},` : "שלום,";
  await sendNotice(
    "sendFrontalReportToRecipient",
    [day.recipientEmail],
    `סיכום היום הפרונטלי, ${hebrewDateLabel(day.date)}`,
    `סיכום היום הפרונטלי ב${day.title}`,
    [
      greeting,
      `מצורף סיכום היום הפרונטלי שהתקיים ב${hebrewDateLabel(day.date)}${day.topic ? `, בנושא ${day.topic}` : ""}.`,
      ...answers.filter((a) => a.value).map((a) => `${a.label}:\n${a.value}`),
      ...surveyLines,
      "תודה על שיתוף הפעולה,\nצוות פזצט״א",
    ]
  );
}
