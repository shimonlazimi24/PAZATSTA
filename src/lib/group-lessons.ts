/**
 * Rules for group lessons, kept free of the database so they can be tested.
 *
 * The admin schedules group lessons and says how many teachers each one needs.
 * Every teacher must lead at least one group lesson a month. Sign-up for a month
 * opens at the start of the month before, and teachers who have not signed up by
 * the 20th are reminded.
 */

export const WITHDRAW_DEADLINE_DAYS = 7;
export const MISSING_SIGNUP_REMINDER_DAY = 20;
export const MAX_PARTICIPANTS = 1000;

/** "2026-12-03" → "2026-12". */
export function monthKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/** "2026-12" → "2027-01". */
export function nextMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function previousMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** First day of the month and first day of the next, as UTC-midnight dates (Lesson.date convention). */
export function monthRange(monthKey: string): { start: Date; end: Date } {
  return {
    start: new Date(`${monthKey}-01T00:00:00.000Z`),
    end: new Date(`${nextMonthKey(monthKey)}-01T00:00:00.000Z`),
  };
}

const HEBREW_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

/** "2026-12" → "דצמבר 2026". */
export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${HEBREW_MONTHS[m - 1]} ${y}`;
}

function daysBetween(fromDateStr: string, toDateStr: string): number {
  const a = Date.parse(`${fromDateStr}T00:00:00Z`);
  const b = Date.parse(`${toDateStr}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export type Verdict = { ok: true } | { ok: false; message: string };

/** Whether the lesson's start time has passed, by Israel date and time. */
export function hasStarted(dateStr: string, startTime: string, todayStr: string, nowHHMM: string): boolean {
  if (dateStr < todayStr) return true;
  if (dateStr > todayStr) return false;
  return nowHHMM >= startTime;
}

export function canSignUp(p: {
  status: string;
  dateStr: string;
  startTime: string;
  teachersNeeded: number;
  signedCount: number;
  alreadySigned: boolean;
  todayStr: string;
  nowHHMM: string;
}): Verdict {
  if (p.status !== "open") return { ok: false, message: "השיעור בוטל" };
  if (p.alreadySigned) return { ok: false, message: "כבר נרשמת לשיעור הזה" };
  if (hasStarted(p.dateStr, p.startTime, p.todayStr, p.nowHHMM)) return { ok: false, message: "השיעור כבר התחיל" };
  if (p.signedCount >= p.teachersNeeded) return { ok: false, message: "השיעור מלא. בחרו שיעור אחר" };
  return { ok: true };
}

/** Teachers can step out up to a week before; after that the admin has to find a replacement. */
export function canWithdraw(p: { dateStr: string; todayStr: string }): Verdict {
  if (daysBetween(p.todayStr, p.dateStr) < WITHDRAW_DEADLINE_DAYS) {
    return {
      ok: false,
      message: `אפשר לבטל הרשמה עד ${WITHDRAW_DEADLINE_DAYS} ימים לפני השיעור. כדי לבטל עכשיו פנו לשחר`,
    };
  }
  return { ok: true };
}

export function canReport(p: {
  status: string;
  started: boolean;
  signed: boolean;
  alreadyReported: boolean;
}): Verdict {
  if (!p.signed) return { ok: false, message: "רק מדריך שרשום לשיעור יכול למלא עליו דוח" };
  if (p.status !== "open") return { ok: false, message: "השיעור בוטל" };
  if (!p.started) return { ok: false, message: "אפשר למלא דוח אחרי שהשיעור התחיל" };
  if (p.alreadyReported) return { ok: false, message: "כבר שלחת דוח על השיעור הזה" };
  return { ok: true };
}

export type NoticeKind = "signup_open" | "missing_signup";

/**
 * Monthly notices due today, both about next month. Each is recorded once per
 * month, so a daily job that misses a day still sends it the next day.
 */
export function noticesDue(todayStr: string): { kind: NoticeKind; monthKey: string }[] {
  const target = nextMonthKey(monthKeyOf(todayStr));
  const day = Number(todayStr.slice(8, 10));
  const due: { kind: NoticeKind; monthKey: string }[] = [{ kind: "signup_open", monthKey: target }];
  if (day >= MISSING_SIGNUP_REMINDER_DAY) due.push({ kind: "missing_signup", monthKey: target });
  return due;
}

/** Teachers with no sign-up in the month, in the order given. */
export function teachersWithoutSignup<T extends { id: string }>(teachers: T[], signedTeacherIds: Iterable<string>): T[] {
  const signed = new Set(signedTeacherIds);
  return teachers.filter((t) => !signed.has(t.id));
}

export function typeLabel(type: { category: string; name: string }): string {
  return `${type.category} – ${type.name}`;
}
