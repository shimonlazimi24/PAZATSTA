import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatIsraelYYYYMMDD,
  parseYYYYMMDD,
  utcDayBounds,
  availabilityDateFromYYYYMMDD,
  addDaysYYYYMMDD,
  normalizeTimeForCompare,
  isLessonEnded,
  isLessonStarted,
} from "../src/lib/dates";

test("formatIsraelYYYYMMDD uses the Israel calendar day, not UTC", () => {
  // 22:30 UTC on Jan 1 is already Jan 2 in Israel (UTC+2 in winter).
  const late = new Date("2026-01-01T22:30:00.000Z");
  assert.equal(formatIsraelYYYYMMDD(late), "2026-01-02");
  assert.equal(late.toISOString().slice(0, 10), "2026-01-01", "UTC would disagree — that is the bug this guards");
});

test("formatIsraelYYYYMMDD handles summer offset (UTC+3)", () => {
  const late = new Date("2026-07-01T21:30:00.000Z");
  assert.equal(formatIsraelYYYYMMDD(late), "2026-07-02");
});

test("parseYYYYMMDD rejects anything that is not YYYY-MM-DD", () => {
  assert.equal(parseYYYYMMDD("not-a-date"), null);
  assert.equal(parseYYYYMMDD("2026-1-1"), null);
  assert.equal(parseYYYYMMDD(""), null);
  assert.ok(parseYYYYMMDD("2026-03-15") instanceof Date);
});

test("availability rows are keyed at midnight UTC", () => {
  // The cancel path and the expiry path must produce the identical Date, or the
  // unique index on (teacherId, date, startTime) stops matching.
  const d = availabilityDateFromYYYYMMDD("2026-03-15");
  assert.equal(d.toISOString(), "2026-03-15T00:00:00.000Z");
});

test("utcDayBounds spans the whole stored day", () => {
  const { gte, lte } = utcDayBounds("2026-03-15");
  assert.equal(gte.toISOString(), "2026-03-15T00:00:00.000Z");
  assert.equal(lte.toISOString(), "2026-03-15T23:59:59.999Z");
  // Rows are written at either T00 or T12; both must fall inside.
  assert.ok(availabilityDateFromYYYYMMDD("2026-03-15") >= gte);
  assert.ok(new Date("2026-03-15T12:00:00.000Z") <= lte);
});

test("addDaysYYYYMMDD crosses month and year boundaries", () => {
  assert.equal(addDaysYYYYMMDD("2026-03-30", 3), "2026-04-02");
  assert.equal(addDaysYYYYMMDD("2026-12-30", 3), "2027-01-02");
  assert.equal(addDaysYYYYMMDD("2028-02-28", 1), "2028-02-29", "2028 is a leap year");
});

test("addDaysYYYYMMDD survives the spring DST transition", () => {
  // Israel moves to DST in late March; parsing at noon UTC keeps the arithmetic safe.
  assert.equal(addDaysYYYYMMDD("2026-03-26", 1), "2026-03-27");
  assert.equal(addDaysYYYYMMDD("2026-03-27", 1), "2026-03-28");
});

test("normalizeTimeForCompare pads to HH:MM", () => {
  assert.equal(normalizeTimeForCompare("9:00"), "09:00");
  assert.equal(normalizeTimeForCompare("09:05"), "09:05");
  assert.equal(normalizeTimeForCompare(""), "00:00");
});

test("lesson start/end gates compare by calendar day first", () => {
  assert.equal(isLessonStarted("2000-01-01", "23:59"), true, "a past day has started");
  assert.equal(isLessonEnded("2000-01-01", "00:01"), true, "a past day has ended");
  assert.equal(isLessonStarted("2999-01-01", "00:01"), false, "a future day has not started");
  assert.equal(isLessonEnded("2999-01-01", "23:59"), false, "a future day has not ended");
});
