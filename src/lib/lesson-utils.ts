/**
 * Shared helpers for lesson display (dates, status labels).
 */

/** Format a YYYY-MM-DD date string for display (e.g. "14 במרץ 2026"). */
export function formatLessonDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format date + time for display (e.g. "יום ה 14 במרץ 12:00"). */
export function formatLessonDateTime(dateStr: string, startTime: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return (
    d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" }) +
    " " +
    startTime
  );
}

/** Hebrew label for lesson status. */
export function getStatusLabel(status: string): string {
  if (status === "pending_approval") return "ממתין לאישור";
  if (status === "scheduled") return "מתוזמן";
  if (status === "completed") return "הושלם";
  if (status === "canceled") return "בוטל";
  return status;
}
