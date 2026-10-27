/**
 * Rules for frontal study days, free of the database so they can be tested.
 *
 * The admin opens a day (like a folder) with its location and details, teachers
 * register, get a message with everything they need and a reminder before the
 * day, tick off a preparation checklist, and one of them files a closing report
 * that the admin approves before it goes to the school.
 */

export const REMINDER_DAYS_BEFORE = 2;
export const NO_TEACHER_ALERT_DAYS = 14;
export const WITHDRAW_DEADLINE_DAYS = 7;

export const PLACEHOLDERS = [
  { key: "שם_המדריך", help: "השם של המדריך שמקבל את ההודעה" },
  { key: "כותרת", help: "שם בית הספר או המקום" },
  { key: "תאריך", help: "התאריך, למשל יום חמישי, 12 בנובמבר" },
  { key: "שעות", help: "שעת התחלה וסיום" },
  { key: "כתובת", help: "הכתובת המלאה" },
  { key: "וויז", help: "קישור ניווט בוויז לכתובת" },
  { key: "נושא", help: "נושא היום" },
  { key: "מצגת", help: "קישור למצגת" },
  { key: "איש_קשר", help: "שם איש הקשר במקום" },
  { key: "טלפון_איש_קשר", help: "הטלפון של איש הקשר" },
  { key: "וואטסאפ", help: "קישור הצטרפות לקבוצת הוואטסאפ" },
] as const;

export type PlaceholderKey = (typeof PLACEHOLDERS)[number]["key"];
export type TemplateValues = Record<PlaceholderKey, string>;

export const DEFAULT_MESSAGE_TEMPLATE = `שלום {שם_המדריך},
נרשמת ליום הפרונטלי ב{כותרת}. כל הפרטים כאן:

מתי: {תאריך}, {שעות}
איפה: {כתובת}
ניווט בוויז: {וויז}
נושא: {נושא}
מצגת: {מצגת}
איש קשר במקום: {איש_קשר}, {טלפון_איש_קשר}
קבוצת הוואטסאפ של היום: {וואטסאפ}

לפני היום, עברו על רשימת ההכנות באזור האישי וסמנו כל סעיף שביצעתם.`;

export const DEFAULT_REMINDER_TEMPLATE = `שלום {שם_המדריך},
תזכורת: היום הפרונטלי ב{כותרת} מתקיים ב{תאריך}, {שעות}.

איפה: {כתובת}
ניווט בוויז: {וויז}
מצגת: {מצגת}
איש קשר במקום: {איש_קשר}, {טלפון_איש_קשר}

אם עוד לא סיימתם את רשימת ההכנות, זה הזמן.`;

export const DEFAULT_CHECKLIST = [
  "עברתי על המצגת",
  "הצטרפתי לקבוצת הוואטסאפ של היום",
  "תיאמתי הגעה עם איש הקשר במקום",
  "בדקתי את הדרך ואת החניה",
  "הכנתי את ציוד ההדרכה",
];

const PLACEHOLDER_RE = /\{([^{}\n]+)\}/g;

/**
 * Fills {placeholders}. A line whose placeholder has no value is dropped
 * entirely, so a day without a WhatsApp group simply has no WhatsApp line
 * rather than "קבוצת הוואטסאפ: " with nothing after it. Unknown placeholders
 * are left as written, so a typo is visible in the preview.
 */
export function renderTemplate(template: string, values: Partial<TemplateValues>): string {
  const known = new Set<string>(PLACEHOLDERS.map((p) => p.key));
  const lines = template.split("\n").flatMap((line) => {
    let missing = false;
    const filled = line.replace(PLACEHOLDER_RE, (whole, rawKey: string) => {
      const key = rawKey.trim();
      if (!known.has(key)) return whole;
      const value = values[key as PlaceholderKey]?.trim() ?? "";
      if (!value) missing = true;
      return value;
    });
    return missing ? [] : [filled];
  });
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function unknownPlaceholders(template: string): string[] {
  const known = new Set<string>(PLACEHOLDERS.map((p) => p.key));
  const found = new Set<string>();
  template.replace(PLACEHOLDER_RE, (whole, rawKey: string) => {
    const key = rawKey.trim();
    if (!known.has(key)) found.add(key);
    return whole;
  });
  return Array.from(found);
}

export function wazeUrl(address: string): string {
  return address.trim() ? `https://waze.com/ul?q=${encodeURIComponent(address.trim())}&navigate=yes` : "";
}

export function daysUntil(dateStr: string, todayStr: string): number {
  return Math.round((Date.parse(`${dateStr}T00:00:00Z`) - Date.parse(`${todayStr}T00:00:00Z`)) / 86_400_000);
}

/** The reminder goes out once, from two days before (or later, if the teacher registered late). */
export function reminderDue(p: { dateStr: string; todayStr: string; alreadySent: boolean }): boolean {
  if (p.alreadySent) return false;
  const d = daysUntil(p.dateStr, p.todayStr);
  return d >= 1 && d <= REMINDER_DAYS_BEFORE;
}

/** Warn the admin once when a day two weeks out (or closer) still has nobody. */
export function noTeacherAlertDue(p: { dateStr: string; todayStr: string; signedCount: number; alreadyAlerted: boolean }): boolean {
  if (p.alreadyAlerted || p.signedCount > 0) return false;
  const d = daysUntil(p.dateStr, p.todayStr);
  return d >= 0 && d <= NO_TEACHER_ALERT_DAYS;
}

export type Verdict = { ok: true } | { ok: false; message: string };

export function canRegister(p: {
  status: string;
  dateStr: string;
  todayStr: string;
  teachersNeeded: number;
  signedCount: number;
  alreadySigned: boolean;
}): Verdict {
  if (p.status !== "open") return { ok: false, message: "היום בוטל" };
  if (p.alreadySigned) return { ok: false, message: "כבר נרשמת ליום הזה" };
  if (p.dateStr <= p.todayStr) return { ok: false, message: "ההרשמה ליום הזה נסגרה" };
  if (p.signedCount >= p.teachersNeeded) return { ok: false, message: "כל המקומות ביום הזה נתפסו" };
  return { ok: true };
}

export function canWithdraw(p: { dateStr: string; todayStr: string }): Verdict {
  if (daysUntil(p.dateStr, p.todayStr) < WITHDRAW_DEADLINE_DAYS) {
    return { ok: false, message: `אפשר לבטל הרשמה עד ${WITHDRAW_DEADLINE_DAYS} ימים לפני היום. כדי לבטל עכשיו פנו לשחר` };
  }
  return { ok: true };
}

export type ReportState = "none" | "submitted" | "returned" | "approved";

export type DayTone = "danger" | "warning" | "ok" | "muted";

/** One line the admin can scan: what this day needs right now. */
export function dayStatus(p: {
  status: string;
  dateStr: string;
  todayStr: string;
  teachersNeeded: number;
  signedCount: number;
  report: ReportState;
  sentToRecipient: boolean;
}): { label: string; tone: DayTone } {
  if (p.status === "canceled") return { label: "בוטל", tone: "muted" };
  const d = daysUntil(p.dateStr, p.todayStr);
  if (d < 0) {
    if (p.report === "approved") return p.sentToRecipient ? { label: "הדוח נשלח", tone: "ok" } : { label: "הדוח אושר, לא נשלח", tone: "warning" };
    if (p.report === "submitted") return { label: "דוח ממתין לאישור", tone: "warning" };
    if (p.report === "returned") return { label: "הדוח הוחזר למדריך", tone: "warning" };
    return { label: "ממתין לדוח סיום", tone: "warning" };
  }
  if (p.signedCount === 0) return { label: "אין מדריכים", tone: d <= NO_TEACHER_ALERT_DAYS ? "danger" : "warning" };
  const missing = p.teachersNeeded - p.signedCount;
  if (missing > 0) return { label: missing === 1 ? "חסר מדריך אחד" : `חסרים ${missing} מדריכים`, tone: "warning" };
  return { label: "כל המדריכים רשומים", tone: "ok" };
}

export type ReportField = { id: string; label: string; kind: string; required: boolean };

/** Checks a submitted report against the fields; returns the answers to store, or the first problem. */
export function buildReportAnswers(
  fields: ReportField[],
  input: Record<string, unknown>
): { ok: true; answers: { label: string; value: string }[] } | { ok: false; message: string } {
  const answers: { label: string; value: string }[] = [];
  for (const f of fields) {
    const raw = input[f.id];
    const value = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim() : "";
    if (f.required && !value) return { ok: false, message: `נא למלא: ${f.label}` };
    if (f.kind === "number" && value && !/^\d{1,6}$/.test(value)) return { ok: false, message: `${f.label}: מספר שלם בלבד` };
    if (value.length > 4000) return { ok: false, message: `${f.label}: הטקסט ארוך מדי` };
    answers.push({ label: f.label, value });
  }
  return { ok: true, answers };
}
