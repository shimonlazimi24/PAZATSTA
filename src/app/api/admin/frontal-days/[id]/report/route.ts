import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { hebrewDateLabel } from "@/lib/group-lessons-server";
import { sendNotice } from "@/lib/email";

type Answer = { label: string; value: string };

/**
 * Approve the closing report and send it to the school, or return it to the
 * teacher with a note. Sending happens once; approving twice does not resend.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { action?: unknown; note?: unknown } | null;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 2000) : "";
  const day = await prisma.frontalDay.findUnique({ where: { id }, include: { report: true } });
  if (!day?.report) return NextResponse.json({ error: "עוד לא הוגש דוח ליום הזה" }, { status: 404 });
  const report = day.report;

  if (body?.action === "return") {
    if (!note) return NextResponse.json({ error: "כתבו למדריך מה לתקן" }, { status: 400 });
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

  if (body?.action !== "approve") return NextResponse.json({ error: "פעולה לא מוכרת" }, { status: 400 });
  if (report.status !== "submitted" && report.status !== "approved") {
    return NextResponse.json({ error: "הדוח הוחזר למדריך ועוד לא הוגש מחדש" }, { status: 409 });
  }
  if (!day.recipientEmail) {
    return NextResponse.json({ error: "חסרה כתובת המייל של מקבל הדוח. הוסיפו אותה בפרטי היום" }, { status: 400 });
  }
  if (report.sentToRecipientAt) return NextResponse.json({ ok: true, alreadySent: true });

  const answers = (Array.isArray(report.answers) ? report.answers : []) as Answer[];
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
      "תודה על שיתוף הפעולה,\nצוות פזצט״א",
    ]
  );
  await prisma.frontalDayReport.update({
    where: { id: report.id },
    data: { status: "approved", approvedAt: new Date(), sentToRecipientAt: new Date(), adminNote: note || report.adminNote },
  });
  return NextResponse.json({ ok: true });
}
