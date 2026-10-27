import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canReport,
  canSignUp,
  canWithdraw,
  hasStarted,
  isMonthKey,
  monthLabel,
  monthRange,
  nextMonthKey,
  noticesDue,
  previousMonthKey,
  teachersWithoutSignup,
} from "../src/lib/group-lessons";

test("month keys roll over the year", () => {
  assert.equal(nextMonthKey("2026-12"), "2027-01");
  assert.equal(nextMonthKey("2026-03"), "2026-04");
  assert.equal(previousMonthKey("2027-01"), "2026-12");
  assert.equal(monthLabel("2026-12"), "דצמבר 2026");
  assert.equal(isMonthKey("2026-13"), false);
  assert.equal(isMonthKey("2026-07"), true);
  assert.deepEqual(monthRange("2026-12"), {
    start: new Date("2026-12-01T00:00:00.000Z"),
    end: new Date("2027-01-01T00:00:00.000Z"),
  });
});

const base = {
  status: "open",
  dateStr: "2026-12-10",
  startTime: "10:00",
  teachersNeeded: 2,
  signedCount: 1,
  alreadySigned: false,
  todayStr: "2026-11-20",
  nowHHMM: "09:00",
};

test("a teacher can sign up to an open lesson with a free place", () => {
  assert.deepEqual(canSignUp(base), { ok: true });
});

test("sign-up is refused when full, canceled, started or repeated", () => {
  assert.equal(canSignUp({ ...base, signedCount: 2 }).ok, false);
  assert.equal(canSignUp({ ...base, status: "canceled" }).ok, false);
  assert.equal(canSignUp({ ...base, alreadySigned: true }).ok, false);
  assert.equal(canSignUp({ ...base, todayStr: "2026-12-10", nowHHMM: "10:00" }).ok, false);
  assert.equal(canSignUp({ ...base, todayStr: "2026-12-10", nowHHMM: "09:59" }).ok, true);
});

test("withdrawing is allowed until a week before", () => {
  assert.equal(canWithdraw({ dateStr: "2026-12-10", todayStr: "2026-12-03" }).ok, true);
  assert.equal(canWithdraw({ dateStr: "2026-12-10", todayStr: "2026-12-04" }).ok, false);
});

test("only a signed-up teacher reports, once, after the lesson started", () => {
  const ok = { status: "open", started: true, signed: true, alreadyReported: false };
  assert.equal(canReport(ok).ok, true);
  assert.equal(canReport({ ...ok, signed: false }).ok, false);
  assert.equal(canReport({ ...ok, started: false }).ok, false);
  assert.equal(canReport({ ...ok, alreadyReported: true }).ok, false);
  assert.equal(canReport({ ...ok, status: "canceled" }).ok, false);
});

test("sign-up opening for next month is due from the 1st; the missing reminder from the 20th", () => {
  assert.deepEqual(noticesDue("2026-11-01"), [{ kind: "signup_open", monthKey: "2026-12" }]);
  assert.deepEqual(noticesDue("2026-11-19"), [{ kind: "signup_open", monthKey: "2026-12" }]);
  assert.deepEqual(noticesDue("2026-11-20"), [
    { kind: "signup_open", monthKey: "2026-12" },
    { kind: "missing_signup", monthKey: "2026-12" },
  ]);
  assert.deepEqual(noticesDue("2026-12-25")[1], { kind: "missing_signup", monthKey: "2027-01" });
});

test("teachers without a sign-up are listed", () => {
  const teachers = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(teachersWithoutSignup(teachers, ["b"]).map((t) => t.id), ["a", "c"]);
});

test("start time is compared on the Israeli date", () => {
  assert.equal(hasStarted("2026-12-10", "10:00", "2026-12-11", "08:00"), true);
  assert.equal(hasStarted("2026-12-10", "10:00", "2026-12-09", "23:00"), false);
});
