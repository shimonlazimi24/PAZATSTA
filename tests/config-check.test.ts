import { test } from "node:test";
import assert from "node:assert/strict";
import { missingConfig, REQUIRED_IN_PRODUCTION } from "../src/lib/config-check";

const complete: Record<string, string | undefined> = {
  DATABASE_URL: "postgresql://user:pass@host:6543/db",
  COOKIE_SECRET: "a".repeat(32),
  CRON_SECRET: "cron-secret",
  ADMIN_NOTIFICATION_EMAILS: "ops@example.com",
  RESEND_API_KEY: "re_realkey",
  APP_URL: "https://example.com",
};

test("a fully configured environment reports nothing missing", () => {
  assert.deepEqual(missingConfig(complete), []);
});

test("each required variable is detected when absent", () => {
  for (const name of REQUIRED_IN_PRODUCTION) {
    const env = { ...complete };
    delete env[name];
    assert.deepEqual(missingConfig(env), [name], `${name} was not reported`);
  }
});

test("blank and whitespace-only values count as missing", () => {
  assert.deepEqual(missingConfig({ ...complete, ADMIN_NOTIFICATION_EMAILS: "   " }), [
    "ADMIN_NOTIFICATION_EMAILS",
  ]);
});

test("a COOKIE_SECRET under 32 characters is rejected", () => {
  // getSigningSecret would throw on this anyway; catch it before deploy instead.
  assert.deepEqual(missingConfig({ ...complete, COOKIE_SECRET: "too-short" }), [
    "COOKIE_SECRET",
  ]);
  assert.deepEqual(missingConfig({ ...complete, COOKIE_SECRET: "b".repeat(31) }), [
    "COOKIE_SECRET",
  ]);
  assert.deepEqual(missingConfig({ ...complete, COOKIE_SECRET: "b".repeat(32) }), []);
});

test("the .env.example placeholder API key is treated as unset", () => {
  assert.deepEqual(missingConfig({ ...complete, RESEND_API_KEY: "re_xxxx" }), [
    "RESEND_API_KEY",
  ]);
});

test("several gaps are all reported at once", () => {
  const env = { ...complete };
  delete env.CRON_SECRET;
  delete env.APP_URL;
  assert.deepEqual(missingConfig(env).sort(), ["APP_URL", "CRON_SECRET"]);
});
