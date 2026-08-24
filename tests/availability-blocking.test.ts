import { test } from "node:test";
import assert from "node:assert/strict";

/**
 * Mirrors the rule in /api/teachers/[id]/availability: which lessons hide a slot.
 *
 * This is the safety net that stops an un-run expiry cron from blocking slots
 * forever. If it regresses, nothing errors — teachers just quietly stop getting
 * bookings, so it is worth pinning down.
 */
type Row = {
  status: string;
  approvalExpiresAt: Date | null;
};

function isBlocking(l: Row, now: Date): boolean {
  return !(
    l.status === "pending_approval" &&
    l.approvalExpiresAt !== null &&
    l.approvalExpiresAt < now
  );
}

const now = new Date("2026-08-21T12:00:00.000Z");
const past = new Date("2026-08-20T12:00:00.000Z");
const future = new Date("2026-08-22T12:00:00.000Z");

test("a scheduled lesson always blocks the slot", () => {
  assert.equal(isBlocking({ status: "scheduled", approvalExpiresAt: null }, now), true);
  assert.equal(isBlocking({ status: "scheduled", approvalExpiresAt: past }, now), true);
});

test("a completed lesson blocks the slot", () => {
  assert.equal(isBlocking({ status: "completed", approvalExpiresAt: null }, now), true);
});

test("a pending lesson still inside its approval window blocks the slot", () => {
  assert.equal(isBlocking({ status: "pending_approval", approvalExpiresAt: future }, now), true);
});

test("a pending lesson past its approval window does NOT block the slot", () => {
  // The cron will cancel it; until then the slot must still be bookable.
  assert.equal(isBlocking({ status: "pending_approval", approvalExpiresAt: past }, now), false);
});

test("a pending lesson with no expiry set still blocks", () => {
  // Legacy rows predate approvalExpiresAt; treat them as live rather than free.
  assert.equal(isBlocking({ status: "pending_approval", approvalExpiresAt: null }, now), true);
});
