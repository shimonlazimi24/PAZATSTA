import { test } from "node:test";
import assert from "node:assert/strict";
import { datesOnWeekday, horizonEnd, weekdayOf } from "../src/lib/group-lessons-weekly";

test("Sundays and Tuesdays of November 2026", () => {
  assert.deepEqual(datesOnWeekday("2026-11-01", "2026-11-30", 0), ["2026-11-01", "2026-11-08", "2026-11-15", "2026-11-22", "2026-11-29"]);
  assert.deepEqual(datesOnWeekday("2026-11-01", "2026-11-30", 2), ["2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24"]);
  assert.equal(weekdayOf("2026-11-01"), 0);
});

test("starting mid-week includes today when it is the day, and nothing past the end", () => {
  assert.deepEqual(datesOnWeekday("2026-11-08", "2026-11-14", 0), ["2026-11-08"]);
  assert.deepEqual(datesOnWeekday("2026-11-09", "2026-11-14", 0), []);
});

test("lessons are created through the end of next month", () => {
  assert.equal(horizonEnd("2026-11-08"), "2026-12-31");
  assert.equal(horizonEnd("2026-12-20"), "2027-01-31");
});
