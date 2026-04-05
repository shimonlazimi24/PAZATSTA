import { toDate } from "date-fns-tz";
import { formatDateInIsrael } from "@/lib/date-utils";

const TZ = "Asia/Jerusalem";

/**
 * Instant when the lesson starts (UTC), using calendar day in Israel + startTime (HH:MM).
 */
export function lessonStartsAtUtc(lessonDate: Date, startTime: string): Date {
  const ymd = formatDateInIsrael(lessonDate);
  const [hRaw, mRaw] = startTime.trim().split(/[:\s]/);
  const h = Math.min(23, Math.max(0, parseInt(hRaw ?? "0", 10) || 0));
  const mi = Math.min(59, Math.max(0, parseInt(mRaw ?? "0", 10) || 0));
  const hh = String(h).padStart(2, "0");
  const mm = String(mi).padStart(2, "0");
  const parsed = toDate(`${ymd}T${hh}:${mm}:00`, { timeZone: TZ });
  if (isNaN(parsed.getTime())) {
    throw new Error(`Invalid lesson start: ${ymd} ${startTime}`);
  }
  return parsed;
}
