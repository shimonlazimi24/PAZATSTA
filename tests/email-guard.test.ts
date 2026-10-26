import { test } from "node:test";
import assert from "node:assert/strict";
import { emailDeliveryMode, redirectMessage } from "../src/lib/email-guard";

test("production delivers as addressed", () => {
  assert.deepEqual(emailDeliveryMode({ VERCEL_ENV: "production" }), { kind: "live" });
});

test("production ignores a redirect, so customer mail can never be hijacked", () => {
  assert.deepEqual(
    emailDeliveryMode({ VERCEL_ENV: "production", EMAIL_REDIRECT_TO: "qa@example.com" }),
    { kind: "live" }
  );
});

test("a preview with no redirect sends nothing — the safe default", () => {
  assert.deepEqual(emailDeliveryMode({ VERCEL_ENV: "preview" }), { kind: "blocked" });
  assert.deepEqual(emailDeliveryMode({ VERCEL_ENV: "preview", EMAIL_REDIRECT_TO: "" }), { kind: "blocked" });
  assert.deepEqual(
    emailDeliveryMode({ VERCEL_ENV: "preview", EMAIL_REDIRECT_TO: "not-an-email" }),
    { kind: "blocked" },
    "a malformed redirect must not fall back to real recipients"
  );
});

test("a preview with a redirect sends only to the test inbox", () => {
  assert.deepEqual(
    emailDeliveryMode({ VERCEL_ENV: "preview", EMAIL_REDIRECT_TO: " QA@Example.com " }),
    { kind: "redirect", to: "qa@example.com" }
  );
  assert.equal(emailDeliveryMode({ VERCEL_ENV: "development", EMAIL_REDIRECT_TO: "qa@example.com" }).kind, "redirect");
});

test("APP_ENV=staging guards even when Vercel's own variable is missing or says production", () => {
  assert.equal(emailDeliveryMode({ APP_ENV: "staging" }).kind, "blocked");
  assert.equal(emailDeliveryMode({ APP_ENV: "staging", VERCEL_ENV: "production" }).kind, "blocked");
  assert.deepEqual(
    emailDeliveryMode({ APP_ENV: "Staging", EMAIL_REDIRECT_TO: "qa@example.com" }),
    { kind: "redirect", to: "qa@example.com" }
  );
});

test("off Vercel (local development) delivers as addressed", () => {
  assert.deepEqual(emailDeliveryMode({}), { kind: "live" });
});

test("a redirected message reaches only the test inbox and names the real recipients", () => {
  const out = redirectMessage(
    { from: "a@b.co", to: ["student@x.com", "parent@x.com"], cc: "teacher@x.com", bcc: "admin@x.com", subject: "קוד", text: "123" },
    "qa@example.com"
  );
  assert.equal(out.to, "qa@example.com");
  assert.equal(out.cc, undefined);
  assert.equal(out.bcc, undefined);
  assert.equal(out.subject, "[STAGING → student@x.com, parent@x.com, teacher@x.com, admin@x.com] קוד");
  assert.equal(out.text, "123", "the body is untouched");
});
