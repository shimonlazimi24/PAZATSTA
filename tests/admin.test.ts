import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { canAccessAdmin, getAdminTeacherEmails, getAdminNotificationEmails } from "../src/lib/admin";

beforeEach(() => {
  delete process.env.ADMIN_TEACHER_EMAILS;
  delete process.env.ADMIN_NOTIFICATION_EMAILS;
  // NODE_ENV is typed readonly; the dev fallback path is what we want to exclude.
  (process.env as Record<string, string>).NODE_ENV = "production";
});

test("admins always pass", () => {
  assert.equal(canAccessAdmin({ role: "admin", email: "anyone@example.com" }), true);
});

test("students and unlisted teachers never pass", () => {
  assert.equal(canAccessAdmin({ role: "student", email: "kid@example.com" }), false);
  assert.equal(canAccessAdmin({ role: "teacher", email: "other@example.com" }), false);
});

test("teachers listed in ADMIN_TEACHER_EMAILS pass, case-insensitively", () => {
  process.env.ADMIN_TEACHER_EMAILS = "Lead@Example.com, second@example.com";
  assert.equal(canAccessAdmin({ role: "teacher", email: "lead@example.com" }), true);
  assert.equal(canAccessAdmin({ role: "teacher", email: "LEAD@EXAMPLE.COM" }), true);
  assert.equal(canAccessAdmin({ role: "teacher", email: "second@example.com" }), true);
  assert.equal(canAccessAdmin({ role: "teacher", email: "third@example.com" }), false);
});

test("the env is read per call, not captured at module load", () => {
  assert.deepEqual(getAdminTeacherEmails(), []);
  process.env.ADMIN_TEACHER_EMAILS = "late@example.com";
  assert.deepEqual(getAdminTeacherEmails(), ["late@example.com"]);
});

test("production has no implicit admin teacher", () => {
  assert.deepEqual(getAdminTeacherEmails(), [], "an unset var must not grant anyone access");
});

test("notification addresses come only from the env, and must be deliverable", () => {
  assert.deepEqual(getAdminNotificationEmails(), [], "no hardcoded fallback");
  process.env.ADMIN_NOTIFICATION_EMAILS = "ops@example.co.il, broken, dev@box.local";
  assert.deepEqual(getAdminNotificationEmails(), ["ops@example.co.il"]);
});
