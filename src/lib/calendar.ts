/**
 * Helpers for "Add to calendar" (ICS download + Google Calendar link).
 */

export type CalendarEvent = {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM or HH:MM:SS
  endTime: string;
  title: string;
};

function formatIcsTime(date: string, time: string): string {
  const normalized = (time || "09:00").replace(":", "").slice(0, 4).padEnd(4, "0");
  return `${date.replace(/-/g, "")}T${normalized}00`;
}

function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

export function buildIcsBlob(event: CalendarEvent): Blob {
  const start = formatIcsTime(event.date, event.startTime);
  const end = formatIcsTime(event.date, event.endTime);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paza//Lesson//HE",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Blob([ics], { type: "text/calendar;charset=utf-8" });
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const title = encodeURIComponent(event.title);
  const start = formatIcsTime(event.date, event.startTime);
  const end = formatIcsTime(event.date, event.endTime);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}`;
}

/** Download .ics file and optionally open Google Calendar in a new tab. */
export function addToCalendar(event: CalendarEvent, openGoogle = true): void {
  const blob = buildIcsBlob(event);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "paza-lesson.ics";
  a.click();
  URL.revokeObjectURL(url);
  if (openGoogle) {
    window.open(buildGoogleCalendarUrl(event), "_blank", "noopener,noreferrer");
  }
}
