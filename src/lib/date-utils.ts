/**
 * Israel (Asia/Jerusalem) date helpers for display and "local day" boundaries.
 * Use for emails and cron "today" when product logic is Israel-local.
 */
export const EMAIL_TIMEZONE = "Asia/Jerusalem";

/** Format a Date as YYYY-MM-DD in Israel for display in emails and API responses. */
export function formatDateIsrael(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: EMAIL_TIMEZONE });
}

/** Alias for consistency with route helpers that expect this name. */
export const formatDateInIsrael = formatDateIsrael;

/**
 * Start and end of "today" in Israel (00:00 and end-of-day Israel time).
 * Returns UTC Date range for Prisma queries (lesson dates stored as UTC).
 */
export function getIsraelTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: EMAIL_TIMEZONE });
  const start = new Date(`${todayStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

/**
 * Parse a query/body date string (YYYY-MM-DD). Returns null if invalid.
 * Use for start/end params to avoid wrong dates and injection.
 */
export function parseDateParam(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(trimmed + "T12:00:00.000Z");
  return isNaN(d.getTime()) ? null : d;
}
