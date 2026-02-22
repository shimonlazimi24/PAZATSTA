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
  return {
    subject: "שיעור נקבע – פאזה",
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
  return {
    subject: "דוח סיום שיעור",
    text: lines.join("\n"),
  };
}

export async function sendLessonCompleted(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  date: string;
  summaryText: string;
  homeworkText: string;
  pointsToKeep?: string;
  pointsToImprove?: string;
  tips?: string;
  recommendations?: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
}): Promise<void> {
  const { subject, text } = getLessonCompletedContent(params);
  if (isDev && noRealKey()) {
    console.log("[DEV] Lesson completed email to", params.to, params.summaryText?.slice(0, 50));
    return;
  }
  const resend = getResend();
  const attachment = params.pdfBuffer && params.pdfFilename
    ? [{ filename: params.pdfFilename, content: params.pdfBuffer }]
    : undefined;
  for (const email of params.to) {
    await resend.emails.send({
      from: from(),
      to: email,
      subject,
      text,
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
