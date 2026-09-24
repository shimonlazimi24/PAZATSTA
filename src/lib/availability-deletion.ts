/**
 * What a DELETE on an availability route is being asked to remove.
 *
 * The order is load-bearing. Both routes used to test the date first, so a request
 * that carried a date alongside a slot id would have wiped the teacher's whole day
 * instead of one slot. Resolving it in one tested place keeps that from coming
 * back the next time a caller adds a parameter.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export type AvailabilityDeletion =
  | { kind: "by-id"; id: string; fallback: { date: string; startTime: string } | null }
  | { kind: "by-slot"; date: string; startTime: string }
  | { kind: "whole-day"; date: string }
  | { kind: "invalid" };

export function resolveAvailabilityDeletion(params: {
  id?: string | null;
  date?: string | null;
  startTime?: string | null;
}): AvailabilityDeletion {
  const id = params.id?.trim() || "";
  const date = params.date?.trim() || "";
  const startTime = params.startTime?.trim() || "";

  const hasDate = DATE_PATTERN.test(date);
  const hasTime = TIME_PATTERN.test(startTime);
  const slot = hasDate && hasTime ? { date, startTime } : null;

  // An id names exactly one row, so it wins. The natural key rides along so a
  // stale id can fall through to it rather than failing the request.
  if (id) return { kind: "by-id", id, fallback: slot };
  if (slot) return { kind: "by-slot", ...slot };
  if (hasDate) return { kind: "whole-day", date };
  return { kind: "invalid" };
}
