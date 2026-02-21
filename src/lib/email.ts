import { Resend } from "resend";

const isDev = process.env.NODE_ENV !== "production";
const noRealKey = () =>
  !process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "re_xxxx";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  return new Resend(apiKey);
}

const from = () => process.env.RESEND_FROM ?? "onboarding@resend.dev";

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
  try {
    await getResend().emails.send({
      from: from(),
      to: email,
      subject,
      text,
    });
    return true;
  } catch (err) {
    console.error("[request-code] Resend failed for", email, "->", err);
    if (isDev) {
      console.log("[request-code] Use this OTP for", email, "->", code);
      return false;
    }
    throw err;
  }
}

/** Build booking confirmation email content (for preview or send). */
export function getBookingConfirmationContent(params: {
  studentName: string;
  teacherName: string;
  date: string;
  timeRange: string;
}) {
  return {
    subject: "שיעור נקבע – פאזה",
    text: `שיעור נקבע: ${params.studentName} עם ${params.teacherName} בתאריך ${params.date} בשעה ${params.timeRange}.`,
  };
}

export async function sendBookingConfirmation(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  date: string;
  timeRange: string;
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

/** Build follow-up reminder email content (for preview or send). */
export function getFollowUpReminderContent(params: {
  studentName: string;
  teacherName: string;
  lastLessonDate: string;
}) {
  return {
    subject: "Schedule your next lesson",
    text: `Reminder: It has been over 7 days since the last lesson (${params.lastLessonDate}) for ${params.studentName} with ${params.teacherName}. Consider scheduling the next lesson.`,
  };
}

export async function sendFollowUpReminder(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  lastLessonDate: string;
}): Promise<void> {
  const { subject, text } = getFollowUpReminderContent(params);
  if (isDev && noRealKey()) {
    console.log("[DEV] Follow-up reminder to", params.to);
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
