/**
 * Israel (Asia/Jerusalem) date helpers for UI and API params.
 * Avoid toISOString().slice(0,10) in the UI — it is UTC and can shift the displayed day in Israel.
 */

const TZ = "Asia/Jerusalem";

/** Format a Date as YYYY-MM-DD in Israel. Avoids UTC shift (toISOString().slice(0,10)) in Israel. */
export function formatIsraelDateYYYYMMDD(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "";
  const m = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${y}-${m}-${day}`;
}

/** Alias for formatIsraelDateYYYYMMDD. */
export const formatIsraelYYYYMMDD = formatIsraelDateYYYYMMDD;

/**
 * Parse "YYYY-MM-DD" string. Returns null if invalid.
 * Uses noon UTC to avoid DST edge issues when adding days.
 */
export function parseYYYYMMDD(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(trimmed + "T12:00:00.000Z");
  return isNaN(d.getTime()) ? null : d;
}

/** Add days to a YYYY-MM-DD string and return YYYY-MM-DD in Israel. */
export function addDaysYYYYMMDD(dateStr: string, days: number): string {
  const d = parseYYYYMMDD(dateStr);
  if (!d) return dateStr;
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return formatIsraelDateYYYYMMDD(next);
}

/** Format a YYYY-MM-DD string as short Hebrew date (e.g. for slot labels). */
export function formatHebrewShortDate(dateStr: string): string {
  const d = parseYYYYMMDD(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString("he-IL", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Today's date string in Israel (YYYY-MM-DD). For past-date checks. */
export function todayIsraelYYYYMMDD(): string {
  return formatIsraelDateYYYYMMDD(new Date());
}
