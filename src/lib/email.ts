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

export async function sendLoginCode(email: string, code: string): Promise<void> {
  if (isDev && noRealKey()) {
    console.log("[DEV] Login OTP for", email, "->", code);
    return;
  }
  try {
    await getResend().emails.send({
      from: from(),
      to: email,
      subject: "Your login code",
      text: `Your login code is ${code}. Expires in 10 minutes.`,
    });
  } catch (err) {
    if (isDev) {
      console.log("[DEV] Email failed, use this OTP for", email, "->", code);
      return;
    }
    throw err;
  }
}

export async function sendBookingConfirmation(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  date: string;
  timeRange: string;
}): Promise<void> {
  const text = `Lesson booked: ${params.studentName} with ${params.teacherName} on ${params.date} at ${params.timeRange}.`;
  if (isDev && noRealKey()) {
    console.log("[DEV] Booking confirmation to", params.to, text);
    return;
  }
  const resend = getResend();
  for (const email of params.to) {
    await resend.emails.send({
      from: from(),
      to: email,
      subject: "Lesson booked",
      text,
    });
  }
}

export async function sendLessonCompleted(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  date: string;
  summaryText: string;
  homeworkText: string;
  pdfBuffer?: Buffer;
  pdfFilename?: string;
}): Promise<void> {
  const text = `Lesson completed: ${params.studentName} with ${params.teacherName} on ${params.date}.\n\nSummary: ${params.summaryText}\n\nHomework: ${params.homeworkText}`;
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
      subject: "Lesson summary",
      text,
      attachments: attachment,
    });
  }
}

export async function sendFollowUpReminder(params: {
  to: string[];
  studentName: string;
  teacherName: string;
  lastLessonDate: string;
}): Promise<void> {
  const text = `Reminder: It has been over 7 days since the last lesson (${params.lastLessonDate}) for ${params.studentName} with ${params.teacherName}. Consider scheduling the next lesson.`;
  if (isDev && noRealKey()) {
    console.log("[DEV] Follow-up reminder to", params.to);
    return;
  }
  const resend = getResend();
  for (const email of params.to) {
    await resend.emails.send({
      from: from(),
      to: email,
      subject: "Schedule your next lesson",
      text,
    });
  }
}
