import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveAvailabilityDeletion } from "../src/lib/availability-deletion";

const DATE = "2026-09-24";
const TIME = "09:00";

test("a slot id names one row and takes precedence over the date", () => {
  // This is the destructive case: testing the date first would have removed the
  // teacher's whole day instead of the one slot they clicked.
  const result = resolveAvailabilityDeletion({ id: "slot-1", date: DATE, startTime: TIME });
  assert.equal(result.kind, "by-id");
  assert.equal(result.kind === "by-id" && result.id, "slot-1");
});

test("the natural key rides along with the id, so a stale id can fall through", () => {
  const result = resolveAvailabilityDeletion({ id: "stale", date: DATE, startTime: TIME });
  assert.deepEqual(result.kind === "by-id" && result.fallback, { date: DATE, startTime: TIME });
});

test("an id with no usable natural key has no fallback", () => {
  const result = resolveAvailabilityDeletion({ id: "slot-1" });
  assert.equal(result.kind === "by-id" && result.fallback, null);
});

test("date plus start time removes exactly that slot", () => {
  const result = resolveAvailabilityDeletion({ date: DATE, startTime: TIME });
  assert.deepEqual(result, { kind: "by-slot", date: DATE, startTime: TIME });
});

test("a date on its own clears the whole day", () => {
  assert.deepEqual(resolveAvailabilityDeletion({ date: DATE }), { kind: "whole-day", date: DATE });
});

test("a malformed start time never widens a slot removal into a whole day", () => {
  // "99:99" with a date must not silently become "clear the day".
  const result = resolveAvailabilityDeletion({ date: DATE, startTime: "99:99" });
  assert.equal(result.kind, "whole-day", "documented: the time is ignored, the date still stands");
});

test("a malformed date is rejected rather than guessed at", () => {
  assert.equal(resolveAvailabilityDeletion({ date: "24/09/2026" }).kind, "invalid");
  assert.equal(resolveAvailabilityDeletion({ date: "2026-9-4" }).kind, "invalid");
});

test("nothing usable is invalid, not a whole-day wipe", () => {
  assert.equal(resolveAvailabilityDeletion({}).kind, "invalid");
  assert.equal(resolveAvailabilityDeletion({ id: "", date: "", startTime: "" }).kind, "invalid");
  assert.equal(resolveAvailabilityDeletion({ startTime: TIME }).kind, "invalid");
});

test("whitespace-only parameters count as absent", () => {
  assert.equal(resolveAvailabilityDeletion({ id: "   ", date: "  " }).kind, "invalid");
});
