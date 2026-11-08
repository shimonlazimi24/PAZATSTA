import { test } from "node:test";
import assert from "node:assert/strict";
import { needsRelay, relayTarget, signRelay, verifyRelay } from "../src/lib/sms-relay";

// The secret is read when a signature is made, not on import.
process.env.COOKIE_SECRET ??= "test-secret-for-sms-relay-0123456789abcdef";

test("servers in Asia hand the SMS to Frankfurt; Europe, America and local send directly", () => {
  assert.equal(needsRelay({ VERCEL_REGION: "icn1" }), true);
  assert.equal(needsRelay({ VERCEL_REGION: "hnd1" }), true);
  assert.equal(needsRelay({ VERCEL_REGION: "fra1" }), false);
  assert.equal(needsRelay({ VERCEL_REGION: "iad1" }), false);
  assert.equal(needsRelay({}), false);
});

test("only a fresh request signed by our servers is accepted", () => {
  const now = 1_800_000_000_000;
  const body = signRelay("972546839392", "קוד: 123456", now);
  assert.deepEqual(verifyRelay(body, now + 1000), { to: "972546839392", text: "קוד: 123456" });
  assert.equal(verifyRelay({ ...body, text: "something else" }, now), null);
  assert.equal(verifyRelay({ ...body, to: "972500000000" }, now), null);
  assert.equal(verifyRelay(body, now + 120_000), null);
  assert.equal(verifyRelay({ ...body, sig: "0".repeat(64) }, now), null);
  assert.equal(verifyRelay({}, now), null);
});

test("production relays through its own domain; previews use the deployment URL", () => {
  assert.equal(
    relayTarget({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "www.pazatsta-schedule.com" })?.url,
    "https://www.pazatsta-schedule.com/api/internal/sms"
  );
  const preview = relayTarget({ VERCEL_ENV: "preview", VERCEL_URL: "x.vercel.app", VERCEL_AUTOMATION_BYPASS_SECRET: "b" });
  assert.equal(preview?.url, "https://x.vercel.app/api/internal/sms");
  assert.equal(preview?.headers["x-vercel-protection-bypass"], "b");
  assert.equal(relayTarget({}), null);
});
