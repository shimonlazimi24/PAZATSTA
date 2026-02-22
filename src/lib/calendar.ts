/**
 * Helpers for "Add to calendar" (ICS download + Google Calendar link).
 */

export type CalendarEvent = {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM:SS
  endTime: string;
  title: string;
};

/** Normalize time to HHMM (4 chars): "10:00" or "10:00:00" -> "1000" */
function normalizeTime(time: string): string {
  const digits = (time || "09:00").replace(/:/g, "").replace(/\D/g, "").slice(0, 6);
  return digits.length >= 4 ? digits.slice(0, 4) : digits.padEnd(4, "0");
}

/** Format as YYYYMMDDTHHMMSS (floating local time for ICS). */
function formatIcsDateTime(date: string, time: string): string {
  const datePart = date.replace(/-/g, "");
  const timePart = normalizeTime(time) + "00";
  return `${datePart}T${timePart}`;
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

/** Fold long ICS line at 75 octets (RFC 5545). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 75) {
    const chunk = line.slice(i, i + 75);
    parts.push(parts.length ? " " + chunk : chunk);
  }
  return parts.join("\r\n ");
}

export function buildIcsBlob(event: CalendarEvent): Blob {
  const start = formatIcsDateTime(event.date, event.startTime);
  const end = formatIcsDateTime(event.date, event.endTime);
  const now = new Date();
  const dtstamp =
    now.getUTCFullYear() +
    String(now.getUTCMonth() + 1).padStart(2, "0") +
    String(now.getUTCDate()).padStart(2, "0") +
    "T" +
    String(now.getUTCHours()).padStart(2, "0") +
    String(now.getUTCMinutes()).padStart(2, "0") +
    String(now.getUTCSeconds()).padStart(2, "0") +
    "Z";
  const uid = `paza-lesson-${event.date}-${normalizeTime(event.startTime)}@paza`;
  const summary = escapeIcsText(event.title);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paza//Lesson//HE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    foldLine("SUMMARY:" + summary),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  return new Blob([bom, ics], { type: "text/calendar; charset=utf-8" });
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const title = encodeURIComponent(event.title);
  const start = formatIcsDateTime(event.date, event.startTime);
  const end = formatIcsDateTime(event.date, event.endTime);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}`;
}

export function downloadIcs(event: CalendarEvent): void {
  const blob = buildIcsBlob(event);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "paza-lesson.ics";
  a.click();
  URL.revokeObjectURL(url);
}

/** Download .ics and optionally open Google Calendar (popup may be blocked). */
export function addToCalendar(event: CalendarEvent, openGoogle = true): void {
  downloadIcs(event);
  if (openGoogle) window.open(buildGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
}
