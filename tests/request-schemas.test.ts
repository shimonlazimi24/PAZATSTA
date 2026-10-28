import { test } from "node:test";
import assert from "node:assert/strict";
import { ReportSchema, MAX_FIELD_LENGTH } from "../src/lib/report-schema";
import { VerifyCodeSchema } from "../src/lib/auth-schemas";

/**
 * Pins the regression from the zod 4.6 upgrade: a key missing from the request
 * body made the whole parse fail. In production that rejected every lesson
 * report and every login that did not send a phone number.
 */

test("a report with only the fields the form sends is accepted", () => {
  const r = ReportSchema.safeParse({ summaryText: "סיכום", tipIds: [] });
  assert.equal(r.success, true, JSON.stringify(!r.success && r.error.issues));
  if (r.success) {
    assert.equal(r.data.tips, "");
    assert.equal(r.data.parentEmail, null);
    assert.equal(r.data.screeningType, null);
    assert.equal(r.data.screeningDate, "");
  }
});

test("an empty report body parses to empty fields (required fields are checked separately)", () => {
  assert.equal(ReportSchema.safeParse({}).success, true);
});

test("an over-long field is still rejected", () => {
  const r = ReportSchema.safeParse({ summaryText: "א".repeat(MAX_FIELD_LENGTH + 1) });
  assert.equal(r.success, false);
});

test("login without a phone number is accepted", () => {
  const r = VerifyCodeSchema.safeParse({ email: "Teacher@Example.com ", code: "123 456", role: "teacher" });
  assert.equal(r.success, true, JSON.stringify(!r.success && r.error.issues));
  if (r.success) {
    assert.equal(r.data.email, "teacher@example.com");
    assert.equal(r.data.code, "123456");
    assert.equal(r.data.phone, "");
    assert.equal(r.data.next, "");
  }
});

test("an unknown role falls back to student", () => {
  const r = VerifyCodeSchema.safeParse({ email: "a@b.co", code: "111111", role: "superuser" });
  assert.equal(r.success && r.data.role, "student");
});
