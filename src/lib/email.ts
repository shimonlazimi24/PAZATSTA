import { Resend } from "resend";
import { isValidDeliveryEmail } from "@/lib/validation";

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

/** On 429, wait before retry (exponential: 1.5s, 2s, 2.5s) */
async function sendWith429Retry<T>(
  sendFn: () => Promise<{ data?: T; error: { message?: string } | null }>,
  maxRetries = 3
): Promise<{ data?: T; error: { message?: string } | null }> {
  let result = await sendFn();
  let retries = 0;
  while (result.error && String(result.error?.message ?? "").includes("429") && retries < maxRetries) {
    retries++;
    const waitMs = 1000 + retries * 500;
    console.warn(`[email] Rate limited (429), retrying in ${waitMs}ms (attempt ${retries + 1}/${maxRetries + 1})`);
    await new Promise((r) => setTimeout(r, waitMs));
    result = await sendFn();
  }
  return result;
}

/** Resend SDK returns { data, error } and does not throw. Error has { name, message }. */
function isDomainNotVerifiedError(error: { name?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = typeof error.message === "string" ? error.message : "";
  return /domain|verify|verification|from/i.test(msg);
}

type Message = { subject: string; text: string; html?: string };
export type OutgoingEmail = Message & { to: string };

/** Resend's batch endpoint accepts up to 100 messages per request. */
const BATCH_LIMIT = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Send many individually addressed emails.
 *
 * One HTTP request per 100 messages via Resend's batch endpoint, instead of a
 * serial loop with a 600ms rate-limit delay between each. Messages may differ in
 * subject and body, so a cron can send an entire run in one or two calls.
 *
 * Every recipient gets their own email; nobody appears in anyone else's To header.
 */
export async function sendMessages(label: string, messages: OutgoingEmail[]): Promise<void> {
  const valid = messages.filter((m) => isValidDeliveryEmail(m.to));
  if (valid.length === 0) return;

  const resend = getResend();
  const build = (fromAddr: string, batch: OutgoingEmail[]) =>
    batch.map((m) => ({
      from: fromAddr,
      to: m.to,
      subject: m.subject,
      ...(m.html ? { html: m.html } : {}),
      text: m.text,
    }));

  const fromAddr = from();
  for (const batch of chunk(valid, BATCH_LIMIT)) {
    let result = await sendWith429Retry(() => resend.batch.send(build(fromAddr, batch)));

    if (result.error && fromAddr !== RESEND_DEV_FROM && isDomainNotVerifiedError(result.error)) {
      console.warn(`[${label}] Domain not verified for ${fromAddr}, retrying with ${RESEND_DEV_FROM}`);
      result = await sendWith429Retry(() => resend.batch.send(build(RESEND_DEV_FROM, batch)));
    }

    if (result.error) {
      console.error(`[${label}] Failed for ${batch.length} message(s):`, result.error);
      throw new Error(result.error.message ?? `Failed to send ${label}`);
    }
  }
}

/** Send the same message to each recipient as a separate email. */
async function sendToMany(label: string, to: string[], message: Message): Promise<void> {
  const recipients = Array.from(
    new Set(to.map((e) => e?.trim().toLowerCase()).filter((e): e is string => !!e))
  );
  await sendMessages(label, recipients.map((addr) => ({ ...message, to: addr })));
}

/** Build login OTP email content (for preview or send). */
export function getLoginCodeContent(code: string) {
  return {
    subject: "קוד התחברות – פזצט״א",
    text: `קוד ההתחברות שלך: ${code}\nתוקף: 10 דקות.`,
  };
}

/** Returns true if email was sent, false if only logged (no Resend key or dev fallback). */
export async function sendLoginCode(email: string, code: string): Promise<boolean> {
  if (noRealKey()) {
    if (isDev) {
      console.log("[request-code] OTP for", email, "->", code, "(RESEND_API_KEY not set)");
    } else {
      console.error("[request-code] RESEND_API_KEY not set — no login code was delivered");
    }
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
  studentEmail?: string | null;
  studentPhone?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  notes?: string | null;
  topic?: string | null;
  teacherName: string;
  date: string;
  timeRange: string;
}) {
  const platformUrl = getAppBaseUrl();
  const cancellationPolicy = [
    "",
    "מדיניות ביטולים:",
    "- במידה ואתם רוצים לדחות את השיעור ניתן לעשות זאת עד 12 שעות לפני, ביצירת קשר עם המדריך או המנהל.",
    "- במידה ואתם רוצים לדחות או לבטל את השיעור בפחות מ-12 שעות יהיו דמי ביטול של 50 ש״ח.",
  ].join("\n");

  const platformLines = platformUrl
    ? [
        `קישור לפלטפורמה (מומלץ לשמור בסימניות): ${platformUrl}`,
        "",
      ]
    : [];

  const lines = [
    "בקשה לאישור נשלחה — יש לאשר בפלטפורמה.",
    "",
    ...platformLines,
    `שם מלא של התלמיד: ${params.studentName}`,
    ...(params.studentEmail ? [`אימייל תלמיד: ${params.studentEmail}`] : []),
    ...(params.studentPhone ? [`טלפון תלמיד: ${params.studentPhone}`] : []),
    ...(params.parentName ? [`שם מלא של אחד ההורים: ${params.parentName}`] : []),
    ...(params.parentPhone ? [`טלפון הורה: ${params.parentPhone}`] : []),
    ...(params.parentEmail ? [`אימייל הורה: ${params.parentEmail}`] : []),
    ...(params.notes ? [`במה תרצו להתמקד בשיעור: ${params.notes}`] : []),
    ...(params.topic ? [`סוג המיון: ${params.topic}`] : []),
    `מורה: ${params.teacherName}`,
    `תאריך ושעה: ${params.date} ${params.timeRange}`,
    "",
    "לאחר הכניסה לפלטפורמה: בסעיף «שיעורים בהמתנה לאישור» לחצו על «לאשר».",
    cancellationPolicy,
  ];
  return {
    subject: "בקשה לאישור שיעור – פזצט״א",
    text: lines.join("\n"),
  };
}

/** HTML body for approval-request email (platform CTA + details). */
function getApprovalRequestHtml(params: {
  studentName: string;
  studentEmail?: string | null;
  studentPhone?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  notes?: string | null;
  topic?: string | null;
  teacherName: string;
  date: string;
  timeRange: string;
}): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const platformUrl = getAppBaseUrl();
  const platformCta = platformUrl
    ? `<p style="margin:16px 0"><a href="${esc(platformUrl)}" style="background:#4a7c59;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block">כניסה לפלטפורמה — לאשר שיעור</a></p>`
    : `<p style="font-size:14px;color:#444">היכנסו לאתר/אפליקציה של פזצט״א — בסעיף «שיעורים בהמתנה לאישור» לחצו «לאשר».</p>`;

  const detailRows: string[] = [
    `<tr><td style="padding:4px 0;font-weight:600">שם מלא של התלמיד</td><td style="padding:4px 0">${esc(params.studentName)}</td></tr>`,
  ];
  if (params.studentEmail) detailRows.push(`<tr><td style="padding:4px 0;font-weight:600">אימייל תלמיד</td><td style="padding:4px 0">${esc(params.studentEmail)}</td></tr>`);
  if (params.studentPhone) detailRows.push(`<tr><td style="padding:4px 0;font-weight:600">טלפון תלמיד</td><td style="padding:4px 0">${esc(params.studentPhone)}</td></tr>`);
  if (params.parentName) detailRows.push(`<tr><td style="padding:4px 0;font-weight:600">שם מלא של אחד ההורים</td><td style="padding:4px 0">${esc(params.parentName)}</td></tr>`);
  if (params.parentPhone) detailRows.push(`<tr><td style="padding:4px 0;font-weight:600">טלפון הורה</td><td style="padding:4px 0">${esc(params.parentPhone)}</td></tr>`);
  if (params.parentEmail) detailRows.push(`<tr><td style="padding:4px 0;font-weight:600">אימייל הורה</td><td style="padding:4px 0">${esc(params.parentEmail)}</td></tr>`);
  if (params.notes) detailRows.push(`<tr><td style="padding:4px 0;font-weight:600;vertical-align:top">במה תרצו להתמקד</td><td style="padding:4px 0">${esc(params.notes)}</td></tr>`);
  if (params.topic) detailRows.push(`<tr><td style="padding:4px 0;font-weight:600">סוג המיון</td><td style="padding:4px 0">${esc(params.topic)}</td></tr>`);
  detailRows.push(`<tr><td style="padding:4px 0;font-weight:600">מורה</td><td style="padding:4px 0">${esc(params.teacherName)}</td></tr>`);
  detailRows.push(
    `<tr><td style="padding:4px 0;font-weight:600">תאריך ושעה</td><td style="padding:4px 0">${esc(params.date)} ${esc(params.timeRange)}</td></tr>`
  );

  return `<div dir="rtl" style="font-family:Heebo,sans-serif;max-width:600px">
  <h2 style="font-size:18px;margin:0 0 8px">בקשה לאישור שיעור</h2>
  <p style="margin:0 0 8px">בקשה לאישור נשלחה — יש לאשר בפלטפורמה.</p>
  ${platformCta}
  <table style="border-collapse:collapse;width:100%;margin-top:16px;font-size:15px">${detailRows.join("")}</table>
  <p style="margin-top:20px;font-size:13px;color:#555;font-weight:600">מדיניות ביטולים</p>
  <ul style="margin:8px 0 0;padding-right:20px;font-size:13px;color:#555">
    <li>במידה ואתם רוצים לדחות את השיעור ניתן לעשות זאת עד 12 שעות לפני, ביצירת קשר עם המדריך או המנהל.</li>
    <li>במידה ואתם רוצים לדחות או לבטל את השיעור בפחות מ-12 שעות יהיו דמי ביטול של 50 ש״ח.</li>
  </ul>
</div>`;
}

export async function sendApprovalRequest(params: {
  to: string[];
  /** For dev logs: same email as the lesson teacher (may or may not appear in `to`). */
  teacherEmail?: string | null;
  studentName: string;
  studentEmail?: string | null;
  studentPhone?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  notes?: string | null;
  topic?: string | null;
  teacherName: string;
  date: string;
  timeRange: string;
}): Promise<void> {
  const { subject, text } = getApprovalRequestContent(params);
  const html = getApprovalRequestHtml(params);
  const toEmails = params.to.filter(Boolean);
  if (toEmails.length === 0) {
    console.warn("[sendApprovalRequest] No recipients (teacher + admins)");
    return;
  }
  if (noRealKey()) {
    const teacherAddr = params.teacherEmail?.trim();
    const teacherLower = teacherAddr?.toLowerCase();
    const adminOrOther = teacherLower
      ? toEmails.filter((e) => e.toLowerCase() !== teacherLower)
      : toEmails;
    const teacherInTo = teacherLower
      ? toEmails.some((e) => e.toLowerCase() === teacherLower)
      : false;
    if (teacherAddr && teacherInTo) {
      console.warn(
        "[sendApprovalRequest] Skipped: RESEND_API_KEY not set or placeholder. Would send one email to:",
        toEmails,
        "— מורה:",
        teacherAddr,
        "| אדמין/התראות:",
        adminOrOther.length ? adminOrOther : "(אין נוספים)"
      );
    } else if (teacherAddr && !teacherInTo) {
      console.warn(
        "[sendApprovalRequest] Skipped: RESEND_API_KEY not set or placeholder. Would send to (אדמין בלבד — בסדנה המורה לא מקבל מייל אישור):",
        toEmails,
        "| מורה (לא בנמענים):",
        teacherAddr
      );
    } else {
      console.warn(
        "[sendApprovalRequest] Skipped: RESEND_API_KEY not set or placeholder. Would send to:",
        toEmails
      );
    }
    return;
  }
  await sendToMany("sendApprovalRequest", toEmails, { subject, text, html });
}

/** Build booking confirmation email content (for preview or send). */
export function getBookingConfirmationContent(params: {
  studentName: string;
  studentEmail?: string | null;
  studentPhone?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  notes?: string | null;
  teacherName: string;
  date: string;
  timeRange: string;
  topic?: string;
  screeningDate?: string;
}) {
  const cancellationPolicy = [
    "",
    "מדיניות ביטולים:",
    "- במידה ואתם רוצים לדחות את השיעור ניתן לעשות זאת עד 12 שעות לפני, ביצירת קשר עם המדריך או המנהל.",
    "- במידה ואתם רוצים לדחות או לבטל את השיעור בפחות מ-12 שעות יהיו דמי ביטול של 50 ש״ח.",
  ].join("\n");

  let text = `שיעור נקבע: ${params.studentName} עם ${params.teacherName} בתאריך ${params.date} בשעה ${params.timeRange}.`;
  text += `\nסוג המיון: ${params.topic || "לא צוין"}`;
  if (params.screeningDate) text += `\nתאריך המיון: ${params.screeningDate}`;
  if (params.studentEmail) text += `\nאימייל תלמיד: ${params.studentEmail}`;
  if (params.studentPhone) text += `\nטלפון תלמיד: ${params.studentPhone}`;
  if (params.parentName) text += `\nשם מלא של אחד ההורים: ${params.parentName}`;
  if (params.parentPhone) text += `\nטלפון הורה: ${params.parentPhone}`;
  if (params.parentEmail) text += `\nאימייל הורה: ${params.parentEmail}`;
  if (params.notes) text += `\nבמה תרצו להתמקד בשיעור: ${params.notes}`;
  text += "\nקישור ל-Google Meet יישלח בנפרד (או יופיע בהזמנת היומן).";
  text += cancellationPolicy;
  return {
    subject: "סיכום הזמנה – פזצט״א",
    text,
  };
}

export async function sendBookingConfirmation(params: {
  to: string[];
  studentName: string;
  studentEmail?: string | null;
  studentPhone?: string | null;
  parentName?: string | null;
  parentPhone?: string | null;
  parentEmail?: string | null;
  notes?: string | null;
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
  await sendToMany("sendBookingConfirmation", params.to, { subject, text });
}

function getAppBaseUrl(): string {
  const base = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "";
  return base.replace(/\/$/, "");
}

function buildFullPdfUrl(pdfUrl: string | undefined, lessonId?: string): string | null {
  const base = getAppBaseUrl();
  if (!base) return null;
  if (pdfUrl) {
    const path = pdfUrl.startsWith("/") ? pdfUrl : `/${pdfUrl}`;
    return base + path;
  }
  if (lessonId) {
    return `${base}/api/pdf/lesson-summaries/lesson-${lessonId}.pdf`;
  }
  return null;
}

/** Build lesson-completed email content (short + CTA link). Prefers publicPdfUrl (no auth). */
export function getLessonCompletedContent(params: {
  studentName: string;
  teacherName: string;
  date: string;
  publicPdfUrl?: string;
  pdfUrl?: string;
  lessonId?: string;
}) {
  const fullUrl =
    params.publicPdfUrl ??
    buildFullPdfUrl(params.pdfUrl, params.lessonId);
  const lines = [
    `דוח סיום שיעור: ${params.studentName} עם ${params.teacherName} — ${params.date}`,
    "",
    "הדוח זמין לצפייה ולהורדה בקישור.",
    ...(fullUrl ? ["לצפייה ולהורדת דוח שיעור לחץ כאן: " + fullUrl] : []),
  ];
  return {
    subject: "דוח סיום שיעור – פזצט״א",
    text: lines.join("\n"),
  };
}

/** Build HTML body for lesson-completed email (short + CTA button). Prefers publicPdfUrl (no auth). */
function getLessonCompletedHtml(params: {
  studentName: string;
  teacherName: string;
  date: string;
  publicPdfUrl?: string;
  pdfUrl?: string;
  lessonId?: string;
}): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fullUrl =
    params.publicPdfUrl ??
    buildFullPdfUrl(params.pdfUrl, params.lessonId);
  const downloadCta = fullUrl
    ? `<p style="margin-top:24px"><a href="${esc(fullUrl)}" style="background:#4a7c59;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:600;display:inline-block">לצפייה ולהורדת דוח שיעור לחץ כאן</a></p>`
    : "";
  return `<div dir="rtl" style="font-family:Heebo,sans-serif;max-width:600px">
  <h2>דוח שיעור: ${esc(params.studentName)} עם ${esc(params.teacherName)} — ${esc(params.date)}</h2>
  <p>הדוח זמין לצפייה ולהורדה בקישור.</p>
  ${downloadCta}
</div>`;
}

export async function sendLessonCompleted(params: {
  to: string[];
  lessonId?: string;
  studentName: string;
  teacherName: string;
  date: string;
  publicPdfUrl?: string;
  pdfUrl?: string;
}): Promise<void> {
  const fullUrl = params.publicPdfUrl ?? buildFullPdfUrl(params.pdfUrl, params.lessonId);
  if (process.env.NODE_ENV === "development") {
    console.log("[email] Lesson completed fullUrl:", fullUrl ?? "(none)");
  }
  const { subject, text } = getLessonCompletedContent({
    studentName: params.studentName,
    teacherName: params.teacherName,
    date: params.date,
    publicPdfUrl: params.publicPdfUrl,
    pdfUrl: params.pdfUrl,
    lessonId: params.lessonId,
  });
  const html = getLessonCompletedHtml({
    studentName: params.studentName,
    teacherName: params.teacherName,
    date: params.date,
    publicPdfUrl: params.publicPdfUrl,
    pdfUrl: params.pdfUrl,
    lessonId: params.lessonId,
  });
  if (isDev && noRealKey()) {
    console.log("[DEV] Lesson completed email to", params.to, fullUrl ? `+ CTA link (public): ${fullUrl}` : "no CTA");
    return;
  }
  await sendToMany("sendLessonCompleted", params.to, { subject, text, html });
}

/** Build follow-up reminder email (teacher reminder on student's screening date). */
export function getScreeningFollowUpReminderContent(params: {
  studentName: string;
  studentPhone?: string | null;
  screeningType: string;
  screeningDate: string;
  lastLessonDate: string;
}) {
  const text = [
    `תזכורת פולו-אפ: היום תאריך המיון של התלמיד/ה ${params.studentName}.`,
    ...(params.studentPhone ? [`טלפון תלמיד: ${params.studentPhone}`] : []),
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
  studentPhone?: string | null;
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
  const result = await getResend().emails.send({
    from: from(),
    to: params.to,
    subject,
    text,
  });
  if (result.error) {
    console.error("[sendAdminSummary] Failed:", result.error);
    throw new Error(result.error.message ?? "Failed to send admin summary");
  }
}

/** Build monthly hours summary for admin (payment). */
export function getWeeklyHoursSummaryContent(params: {
  startDate: string;
  endDate: string;
  byTeacher: { teacherName: string; teacherEmail: string; hours: number; lessonCount: number }[];
}) {
  const lines = [
    `סיכום שעות חודשי לתשלום (${params.startDate} – ${params.endDate})`,
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
  await sendToMany("sendWeeklyHoursSummaryToAdmin", params.to, { subject, text });
}

export function getLessonReminder24hContent(params: {
  studentName: string;
  teacherName: string;
  dateLabel: string;
  timeRange: string;
  topic?: string | null;
  isWorkshop: boolean;
  workshopName?: string | null;
}): { subject: string; text: string } {
  const kind = params.isWorkshop ? "מפגש (סדנה)" : "שיעור";
  const lines = [
    "שלום,",
    "",
    `זוהי תזכורת: ${kind} מתקיים בערך בעוד 24 שעות.`,
    "",
    `תלמיד: ${params.studentName}`,
    `מורה: ${params.teacherName}`,
    `תאריך: ${params.dateLabel}`,
    `שעה: ${params.timeRange}`,
  ];
  if (params.workshopName?.trim()) lines.push(`שם הסדנה: ${params.workshopName.trim()}`);
  if (params.topic?.trim()) lines.push(`סוג מיון: ${params.topic.trim()}`);
  const base = getAppBaseUrl();
  if (base) lines.push("", `כניסה לאפליקציה: ${base}`);
  lines.push("", "בברכה,", "פזצט״א");
  return {
    subject: `תזכורת: ${kind} מחר – פזצט״א`,
    text: lines.join("\n"),
  };
}

/** Reminder ~24h before lesson; sends to student + parent emails (deduped). Returns true if mail was sent. */
export async function sendLessonReminder24h(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  dateLabel: string;
  timeRange: string;
  topic?: string | null;
  isWorkshop: boolean;
  workshopName?: string | null;
}): Promise<boolean> {
  const { subject, text } = getLessonReminder24hContent(params);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const e of params.to) {
    const t = e.trim();
    if (!t || !isValidDeliveryEmail(t)) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(t);
  }
  if (unique.length === 0) {
    console.warn("[sendLessonReminder24h] No valid recipient emails");
    return false;
  }
  if (isDev && noRealKey()) {
    console.log("[DEV] Lesson 24h reminder to", unique, text.slice(0, 200));
    return true;
  }
  await sendToMany("sendLessonReminder24h", unique, { subject, text });
  return true;
}

/** Build the "lesson moved" email (sent to student, parent, teacher and admins). */
export function getLessonRescheduledContent(params: {
  studentName: string;
  teacherName: string;
  oldDateLabel: string;
  oldTimeRange: string;
  newDateLabel: string;
  newTimeRange: string;
  topic?: string | null;
}): { subject: string; text: string } {
  const lines = [
    "שלום,",
    "",
    `מועד השיעור של ${params.studentName} עם ${params.teacherName} עודכן.`,
    "",
    `המועד הקודם: ${params.oldDateLabel}, ${params.oldTimeRange}`,
    `המועד החדש: ${params.newDateLabel}, ${params.newTimeRange}`,
  ];
  if (params.topic?.trim()) lines.push(`סוג מיון: ${params.topic.trim()}`);
  const base = getAppBaseUrl();
  if (base) lines.push("", `כניסה לאפליקציה: ${base}`);
  lines.push(
    "",
    "אם המועד החדש לא מתאים, נא ליצור קשר עם המדריך או המנהל.",
    "",
    "בברכה,",
    "פזצט״א"
  );
  return {
    subject: `עדכון מועד שיעור – ${params.newDateLabel}`,
    text: lines.join("\n"),
  };
}

export async function sendLessonRescheduled(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  oldDateLabel: string;
  oldTimeRange: string;
  newDateLabel: string;
  newTimeRange: string;
  topic?: string | null;
}): Promise<void> {
  const { subject, text } = getLessonRescheduledContent(params);
  if (isDev && noRealKey()) {
    console.log("[DEV] Lesson rescheduled email to", params.to.length, "recipient(s)");
    return;
  }
  await sendToMany("sendLessonRescheduled", params.to, { subject, text });
}

/** Build the "lesson canceled" email (sent to student, parent, teacher and admins). */
export function getLessonCanceledContent(params: {
  studentName: string;
  teacherName: string;
  dateLabel: string;
  timeRange: string;
  topic?: string | null;
}): { subject: string; text: string } {
  const lines = [
    "שלום,",
    "",
    `השיעור של ${params.studentName} עם ${params.teacherName} בוטל.`,
    "",
    `תאריך: ${params.dateLabel}`,
    `שעה: ${params.timeRange}`,
  ];
  if (params.topic?.trim()) lines.push(`סוג מיון: ${params.topic.trim()}`);
  const base = getAppBaseUrl();
  if (base) lines.push("", `לקביעת מועד חדש: ${base}`);
  lines.push("", "לשאלות ניתן לפנות למדריך או למנהל.", "", "בברכה,", "פזצט״א");
  return {
    subject: `ביטול שיעור – ${params.dateLabel}`,
    text: lines.join("\n"),
  };
}

export async function sendLessonCanceled(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  dateLabel: string;
  timeRange: string;
  topic?: string | null;
}): Promise<void> {
  const { subject, text } = getLessonCanceledContent(params);
  if (isDev && noRealKey()) {
    console.log("[DEV] Lesson canceled email to", params.to.length, "recipient(s)");
    return;
  }
  await sendToMany("sendLessonCanceled", params.to, { subject, text });
}
