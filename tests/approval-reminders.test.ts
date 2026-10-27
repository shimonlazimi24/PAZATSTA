import { test } from "node:test";
import assert from "node:assert/strict";
import { dueReminderMark, hoursLeftLabel, summarizeReminders } from "../src/lib/approval-reminders";

const H = 60 * 60 * 1000;
const now = new Date("2026-11-01T12:00:00Z");
const expiresIn = (hours: number) => new Date(now.getTime() + hours * H);

test("nothing is due while more than 18 hours remain", () => {
  assert.equal(dueReminderMark({ approvalExpiresAt: expiresIn(20), now, sentMarks: [] }), null);
});

test("the 18-hour reminder is due once 18 hours remain", () => {
  assert.equal(dueReminderMark({ approvalExpiresAt: expiresIn(18), now, sentMarks: [] }), 18);
  assert.equal(dueReminderMark({ approvalExpiresAt: expiresIn(15), now, sentMarks: [] }), 18);
});

test("a sent reminder is not sent again", () => {
  assert.equal(dueReminderMark({ approvalExpiresAt: expiresIn(15), now, sentMarks: [18] }), null);
});

test("the 12-hour reminder follows the 18-hour one", () => {
  assert.equal(dueReminderMark({ approvalExpiresAt: expiresIn(11.5), now, sentMarks: [18] }), 12);
  assert.equal(dueReminderMark({ approvalExpiresAt: expiresIn(3), now, sentMarks: [18, 12] }), null);
});

test("after a missed run, only the more urgent reminder goes out", () => {
  assert.equal(dueReminderMark({ approvalExpiresAt: expiresIn(10), now, sentMarks: [] }), 12);
  // …and the 18-hour one is never sent after it.
  assert.equal(dueReminderMark({ approvalExpiresAt: expiresIn(10), now, sentMarks: [12] }), null);
});

test("an expired request gets no reminder", () => {
  assert.equal(dueReminderMark({ approvalExpiresAt: expiresIn(0), now, sentMarks: [] }), null);
  assert.equal(dueReminderMark({ approvalExpiresAt: expiresIn(-1), now, sentMarks: [] }), null);
});

test("hours left are shown as whole hours, at least one", () => {
  assert.equal(hoursLeftLabel(expiresIn(12.7), now), 13);
  assert.equal(hoursLeftLabel(expiresIn(17.9), now), 18);
  assert.equal(hoursLeftLabel(expiresIn(0.2), now), 1);
});

test("the admin summary counts reminders, approvals after them, expiries and approval time", () => {
  const created = new Date(now.getTime() - 20 * H);
  const stats = summarizeReminders(
    [
      { lessonId: "a", teacherId: "t1", mark: 18, sentAt: new Date(created.getTime() + 6 * H) },
      { lessonId: "a", teacherId: "t1", mark: 12, sentAt: new Date(created.getTime() + 12 * H) },
      { lessonId: "b", teacherId: "t1", mark: 18, sentAt: new Date(created.getTime() + 6 * H) },
    ],
    [
      // approved 14h after the request, after the first reminder
      { id: "a", teacherId: "t1", status: "scheduled", createdAt: created, approvedByTeacherAt: new Date(created.getTime() + 14 * H), approvedByAdminAt: null, approvalExpiresAt: new Date(created.getTime() + 24 * H), canceledAt: null },
      // never approved, window closed → expired
      { id: "b", teacherId: "t1", status: "canceled", createdAt: new Date(now.getTime() - 30 * H), approvedByTeacherAt: null, approvedByAdminAt: null, approvalExpiresAt: new Date(now.getTime() - 6 * H), canceledAt: new Date(now.getTime() - 5 * H) },
      // another teacher, approved quickly, never reminded
      { id: "c", teacherId: "t2", status: "scheduled", createdAt: created, approvedByTeacherAt: new Date(created.getTime() + 1 * H), approvedByAdminAt: null, approvalExpiresAt: null, canceledAt: null },
    ],
    now
  );
  const t1 = stats.find((s) => s.teacherId === "t1")!;
  assert.deepEqual(
    { ...t1 },
    { teacherId: "t1", remindersSent: 3, lessonsReminded: 2, approvedAfterReminder: 1, expiredUnapproved: 1, medianHoursToApprove: 14 }
  );
  const t2 = stats.find((s) => s.teacherId === "t2")!;
  assert.equal(t2.remindersSent, 0);
  assert.equal(t2.medianHoursToApprove, 1);
  assert.equal(stats[0].teacherId, "t1", "teachers who needed reminding come first");
});

test("a request rejected by the teacher is not counted as expired", () => {
  const stats = summarizeReminders(
    [],
    [
      // rejected 2h after booking; its window has since closed, but it was not an expiry
      { id: "r", teacherId: "t", status: "canceled", createdAt: new Date(now.getTime() - 30 * H), approvedByTeacherAt: null, approvedByAdminAt: null, approvalExpiresAt: new Date(now.getTime() - 6 * H), canceledAt: new Date(now.getTime() - 28 * H) },
    ],
    now
  );
  assert.equal(stats[0].expiredUnapproved, 0);
});

test("rows canceled before canceledAt existed fall back to the closed window", () => {
  const stats = summarizeReminders(
    [],
    [{ id: "old", teacherId: "t", status: "canceled", createdAt: new Date(now.getTime() - 30 * H), approvedByTeacherAt: null, approvedByAdminAt: null, approvalExpiresAt: new Date(now.getTime() - 6 * H), canceledAt: null }],
    now
  );
  assert.equal(stats[0].expiredUnapproved, 1);
});
