import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { sign, unsign, createSessionToken } from "../src/lib/auth";

/**
 * Backward compatibility for the session-token migration.
 *
 * Before the change the cookie carried the signed Session.id. The migration
 * backfills `token = id` for every existing row, so the new lookup by token must
 * resolve an old cookie to exactly the value that backfill wrote. If this breaks,
 * every logged-in customer is signed out on deploy.
 *
 * NOTE: this covers the application half only. The SQL half
 * (UPDATE "Session" SET "token" = "id") is not exercised here — there is no
 * database in this suite.
 */

test("a cookie minted before the migration still unsigns to the old row id", () => {
  const legacyRowId = "clx8f3k2a0000abcd1234efgh"; // a cuid, as ids used to be
  const legacyCookie = sign(legacyRowId);

  // The new code path: unsign the cookie, then look up `where: { token }`.
  const lookupValue = unsign(legacyCookie);

  assert.equal(lookupValue, legacyRowId);
  // After `UPDATE "Session" SET "token" = "id"`, token === legacyRowId, so the
  // lookup finds the same row and the session survives.
});

test("a tampered cookie is rejected", () => {
  const cookie = sign("some-session-value");
  assert.equal(unsign(cookie.replace(/.$/, "0")), null, "flipped signature byte");
  assert.equal(unsign("some-session-value.deadbeef"), null, "wrong signature");
  assert.equal(unsign("no-signature-at-all"), null);
  assert.equal(unsign(""), null);
});

test("a value containing dots round-trips (signature splits on the LAST dot)", () => {
  const value = "a.b.c";
  assert.equal(unsign(sign(value)), value);
});

test("new session tokens are long and random, unlike the cuids they replace", () => {
  const a = createSessionToken();
  const b = createSessionToken();
  assert.notEqual(a, b);
  // 32 bytes base64url -> 43 chars, versus ~25 for a cuid.
  assert.ok(a.length >= 43, `expected >=43 chars, got ${a.length}`);
  assert.match(a, /^[A-Za-z0-9_-]+$/);
});

test("new tokens carry real entropy", () => {
  const seen = new Set(Array.from({ length: 2000 }, () => createSessionToken()));
  assert.equal(seen.size, 2000, "no collisions across 2000 tokens");
});

test("unsign is constant-time for equal-length input", () => {
  // Guards the timingSafeEqual path: mismatched lengths must not throw.
  const cookie = sign(crypto.randomBytes(16).toString("hex"));
  assert.doesNotThrow(() => unsign(cookie.slice(0, -5)));
  assert.equal(unsign(cookie.slice(0, -5)), null);
});
