import { Resend } from "resend";

const isDev = process.env.NODE_ENV !== "production";
const noRealKey = () =>
  !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_xxxx";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  return new Resend(apiKey);
}

const RESEND_DEV_FROM = "onboarding@resend.dev";
const from = () => process.env.RESEND_FROM ?? RESEND_DEV_FROM;

/** Resend SDK returns { data, error } and does not throw. Error has { name, message }. */
function isDomainNotVerifiedError(error: { name?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = typeof error.message === "string" ? error.message : "";
  return /domain|verify|verification|from/i.test(msg);
}

/** Build login OTP email content (for preview or send). */
export function getLoginCodeContent(code: string) {
  return {
    subject: "קוד התחברות – פאזה",
    text: `קוד ההתחברות שלך: ${code}\nתוקף: 10 דקות.`,
  };
}

/** Returns true if email was sent, false if only logged (no Resend key or dev fallback). */
export async function sendLoginCode(email: string, code: string): Promise<boolean> {
  if (noRealKey()) {
    console.log("[request-code] OTP for", email, "->", code, "(RESEND_API_KEY not set or placeholder)");
    return false;
  }
  const { subject, text } = getLoginCodeContent(code);
  const fromAddr = from();

  const result = await getResend().emails.send({
    from: fromAddr,
    to: email,
    subject,
    text,
  });

  if (!result.error) return true;

  if (fromAddr !== RESEND_DEV_FROM && isDomainNotVerifiedError(result.error)) {
    console.warn("[request-code] Domain not verified for", fromAddr, ", retrying with", RESEND_DEV_FROM);
    const retry = await getResend().emails.send({
      from: RESEND_DEV_FROM,
      to: email,
      subject,
      text,
    });
    if (!retry.error) return true;
    console.error("[request-code] Retry failed for", email, "->", retry.error);
  } else {
    console.error("[request-code] Resend failed for", email, "->", result.error);
  }

  if (isDev) {
    console.log("[request-code] Use this OTP for", email, "->", code);
    return false;
  }
  throw new Error(result.error.message ?? "Failed to send email");
}

/** Build approval-request email (sent to admin + teacher when student books). */
export function getApprovalRequestContent(params: {
  studentName: string;
  teacherName: string;
  date: string;
  timeRange: string;
}) {
  const text = [
    "בקשה לאישור נשלחה — יש לאשר באפליקציה.",
    "",
    `תלמיד: ${params.studentName}`,
    `מורה: ${params.teacherName}`,
    `תאריך ושעה: ${params.date} ${params.timeRange}`,
    "",
    "היכנסו לאפליקציה ולחצו על 'לאשר' בסעיף 'שיעורים בהמתנה לאישור'.",
  ].join("\n");
  return {
    subject: "בקשה לאישור שיעור – פאזה",
    text,
  };
}

export async function sendApprovalRequest(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  date: string;
  timeRange: string;
}): Promise<void> {
  const { subject, text } = getApprovalRequestContent(params);
  const toEmails = params.to.filter(Boolean);
  if (toEmails.length === 0) {
    console.warn("[sendApprovalRequest] No recipients (teacher + admins)");
    return;
  }
  if (noRealKey()) {
    console.log("[sendApprovalRequest] DEV: would send to", toEmails, subject);
    return;
  }
  const fromAddr = from();
  const resend = getResend();
  for (const email of toEmails) {
    const result = await resend.emails.send({
      from: fromAddr,
      to: email,
      subject,
      text,
    });
    if (result.error) {
      if (fromAddr !== RESEND_DEV_FROM && isDomainNotVerifiedError(result.error)) {
        const retry = await resend.emails.send({
          from: RESEND_DEV_FROM,
          to: email,
          subject,
          text,
        });
        if (!retry.error) continue;
        console.error("[sendApprovalRequest] Retry failed for", email, retry.error);
      } else {
        console.error("[sendApprovalRequest] Failed for", email, result.error);
      }
      throw new Error(result.error.message ?? "Failed to send approval email");
    }
  }
}

/** Build booking confirmation email content (for preview or send). */
export function getBookingConfirmationContent(params: {
  studentName: string;
  teacherName: string;
  date: string;
  timeRange: string;
  topic?: string;
  screeningDate?: string;
}) {
  let text = `שיעור נקבע: ${params.studentName} עם ${params.teacherName} בתאריך ${params.date} בשעה ${params.timeRange}.`;
  if (params.topic) text += `\nסוג המיון: ${params.topic}`;
  if (params.screeningDate) text += `\nתאריך המיון: ${params.screeningDate}`;
  text += "\nקישור ל-Google Meet יישלח בנפרד (או יופיע בהזמנת היומן).";
  return {
    subject: "סיכום הזמנה – פאזה",
    text,
  };
}

export async function sendBookingConfirmation(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  date: string;
  timeRange: string;
  topic?: string;
  screeningDate?: string;
}): Promise<void> {
  const { subject, text } = getBookingConfirmationContent(params);
  if (isDev && noRealKey()) {
    console.log("[DEV] Booking confirmation to", params.to, text);
    return;
  }
  const resend = getResend();
  for (const email of params.to) {
    await resend.emails.send({
      from: from(),
      to: email,
      subject,
      text,
    });
  }
}

function getAppBaseUrl(): string {
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  return base.replace(/\/$/, "");
}

/** Build lesson-completed email content (for preview or send). */
export function getLessonCompletedContent(params: {
  studentName: string;
  teacherName: string;
  date: string;
  summaryText: string;
  homeworkText: string;
  pointsToKeep?: string;
  pointsToImprove?: string;
  tips?: string;
  recommendations?: string;
  pdfUrl?: string;
}) {
  const lines = [
    `דוח שיעור: ${params.studentName} עם ${params.teacherName} — ${params.date}`,
    "",
    "סיכום כללי: " + (params.summaryText || "—"),
    "נקודות לשימור: " + (params.pointsToKeep || "—"),
    "נקודות לשיפור: " + (params.pointsToImprove || "—"),
    "טיפים: " + (params.tips || "—"),
    "המלצות להמשך: " + (params.recommendations || "—"),
    "משימות לתרגול: " + (params.homeworkText || "—"),
  ];
  if (params.pdfUrl) {
    const base = getAppBaseUrl();
    const fullUrl = base ? `${base}${params.pdfUrl.startsWith("/") ? "" : "/"}${params.pdfUrl}` : params.pdfUrl;
    lines.push("", `הורדת סיכום PDF: ${fullUrl}`);
  }
  return {
    subject: "דוח סיום שיעור",
    text: lines.join("\n"),
  };
}

/** Build HTML body for lesson-completed email with download CTA. */
function getLessonCompletedHtml(params: {
  studentName: string;
  teacherName: string;
  date: string;
  summaryText: string;
  homeworkText: string;
  pointsToKeep?: string;
  pointsToImprove?: string;
  tips?: string;
  recommendations?: string;
  pdfUrl?: string;
}): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const base = getAppBaseUrl();
  const fullUrl = params.pdfUrl && base ? `${base}${params.pdfUrl.startsWith("/") ? "" : "/"}${params.pdfUrl}` : null;
  const rows = [
    ["סיכום כללי", params.summaryText || "—"],
    ["נקודות לשימור", params.pointsToKeep || "—"],
    ["נקודות לשיפור", params.pointsToImprove || "—"],
    ["טיפים", params.tips || "—"],
    ["המלצות להמשך", params.recommendations || "—"],
    ["משימות לתרגול", params.homeworkText || "—"],
  ];
  const body = rows.map(([label, val]) => `<p><strong>${esc(label)}:</strong> ${esc(val)}</p>`).join("");
  const downloadCta = fullUrl
    ? `<p style="margin-top:20px"><a href="${esc(fullUrl)}" style="background:#4a7c59;color:white;padding:10px 20px;text-decoration:none;border-radius:6px">הורד סיכום PDF</a></p>`
    : "";
  return `<div dir="rtl" style="font-family:Heebo,sans-serif;max-width:600px">
  <h2>דוח שיעור: ${esc(params.studentName)} עם ${esc(params.teacherName)} — ${esc(params.date)}</h2>
  ${body}
  ${downloadCta}
</div>`;
}

export async function sendLessonCompleted(params: {
  to: string[];
  lessonId?: string;
  studentName: string;
  teacherName: string;
  date: string;
  summaryText: string;
  homeworkText: string;
  pointsToKeep?: string;
  pointsToImprove?: string;
  tips?: string;
  recommendations?: string;
  pdfUrl?: string;
  pdfBuffer?: Buffer;
}): Promise<void> {
  const { subject, text } = getLessonCompletedContent(params);
  const html = getLessonCompletedHtml(params);
  if (isDev && noRealKey()) {
    console.log("[DEV] Lesson completed email to", params.to, params.pdfBuffer ? `+ PDF (${params.pdfBuffer.length} bytes)` : "text only");
    return;
  }
  const resend = getResend();
  const filename = params.lessonId ? `lesson-${params.lessonId}.pdf` : "lesson-summary.pdf";
  const base64 = params.pdfBuffer ? params.pdfBuffer.toString("base64") : "";
  const attachment = base64
    ? [{ filename, content: base64, contentType: "application/pdf" as const }]
    : undefined;
  if (attachment) {
    console.log("[email] Sending lesson completed with PDF attachment, size:", params.pdfBuffer!.length, "bytes");
  } else if (params.pdfBuffer) {
    console.warn("[email] PDF buffer present but attachment not created");
  } else {
    console.log("[email] Sending lesson completed without PDF (generation failed)");
  }
  for (const email of params.to) {
    await resend.emails.send({
      from: from(),
      to: email,
      subject,
      text,
      html,
      attachments: attachment,
    });
  }
}

/** Build follow-up reminder email (teacher reminder on student's screening date). */
export function getScreeningFollowUpReminderContent(params: {
  studentName: string;
  screeningType: string;
  screeningDate: string;
  lastLessonDate: string;
}) {
  const text = [
    `תזכורת פולו-אפ: היום תאריך המיון של התלמיד/ה ${params.studentName}.`,
    `סוג המיון: ${params.screeningType}`,
    `תאריך המיון: ${params.screeningDate}`,
    `שיעור אחרון: ${params.lastLessonDate}`,
    "",
    "מומלץ ליצור קשר עם התלמיד/ה ולוודא שהכל מוכן למיון.",
  ].join("\n");
  return {
    subject: "תזכורת פולו-אפ לתלמיד",
    text,
  };
}

export async function sendScreeningFollowUpReminder(params: {
  to: string;
  studentName: string;
  screeningType: string;
  screeningDate: string;
  lastLessonDate: string;
}): Promise<void> {
  const { subject, text } = getScreeningFollowUpReminderContent(params);
  if (isDev && noRealKey()) {
    console.log("[DEV] Screening follow-up reminder to", params.to);
    return;
  }
  const res = await getResend().emails.send({
    from: from(),
    to: params.to,
    subject,
    text,
  });
  if (res.error) console.error("[sendScreeningFollowUpReminder]", res.error);
}

/** Build admin summary email content (for preview or send). */
export function getAdminSummaryContent(params: {
  startDate: string;
  endDate: string;
  lessons: {
    date: string;
    startTime: string;
    endTime: string;
    teacherName: string;
    studentName: string;
    summaryText: string;
    homeworkText: string;
  }[];
}) {
  const lines = [
    `סיכום שיעורים שהושלמו (${params.startDate} – ${params.endDate})`,
    "",
    ...params.lessons.map(
      (l) =>
        `${l.date} ${l.startTime}–${l.endTime} | ${l.teacherName} ↔ ${l.studentName}\nסיכום: ${l.summaryText || "—"}\nמשימות: ${l.homeworkText || "—"}`
    ),
  ];
  return {
    subject: `סיכום שיעורים ${params.startDate} – ${params.endDate}`,
    text: lines.join("\n"),
  };
}

export async function sendAdminSummary(params: {
  to: string;
  startDate: string;
  endDate: string;
  lessons: {
    date: string;
    startTime: string;
    endTime: string;
    teacherName: string;
    studentName: string;
    summaryText: string;
    homeworkText: string;
  }[];
}): Promise<void> {
  const { subject, text } = getAdminSummaryContent(params);
  if (isDev && noRealKey()) {
    console.log("[DEV] Admin summary to", params.to, params.lessons.length, "lessons");
    return;
  }
  await getResend().emails.send({
    from: from(),
    to: params.to,
    subject,
    text,
  });
}

/** Build weekly hours summary for admin (payment). */
export function getWeeklyHoursSummaryContent(params: {
  startDate: string;
  endDate: string;
  byTeacher: { teacherName: string; teacherEmail: string; hours: number; lessonCount: number }[];
}) {
  const lines = [
    `סיכום שעות שבועי לתשלום (${params.startDate} – ${params.endDate})`,
    "",
    ...params.byTeacher.map(
      (t) =>
        `${t.teacherName} (${t.teacherEmail}): ${t.hours.toFixed(2)} שעות, ${t.lessonCount} שיעורים`
    ),
    "",
    "סה״כ מורים: " + params.byTeacher.length,
  ];
  return {
    subject: `סיכום שעות מורים – ${params.startDate} עד ${params.endDate}`,
    text: lines.join("\n"),
  };
}

export async function sendWeeklyHoursSummaryToAdmin(params: {
  to: string[];
  startDate: string;
  endDate: string;
  byTeacher: { teacherName: string; teacherEmail: string; hours: number; lessonCount: number }[];
}): Promise<void> {
  if (params.byTeacher.length === 0) return;
  const { subject, text } = getWeeklyHoursSummaryContent(params);
  if (isDev && noRealKey()) {
    console.log("[DEV] Weekly hours summary to", params.to);
    return;
  }
  const resend = getResend();
  for (const email of params.to) {
    await resend.emails.send({
      from: from(),
      to: email,
      subject,
      text,
    });
  }
}
