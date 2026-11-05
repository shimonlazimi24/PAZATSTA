import { test } from "node:test";
import assert from "node:assert/strict";
import { makePhoneProof, phoneCodeKey, readPhoneProof } from "../src/lib/phone-proof";

// The secret is read when a proof is made, not on import.
process.env.COOKIE_SECRET ??= "test-secret-for-phone-proof-0123456789abcdef";

test("a fresh proof gives back the confirmed number", () => {
  const now = 1_800_000_000_000;
  const proof = makePhoneProof("+972546839392", now);
  assert.equal(readPhoneProof(proof, now + 60_000), "+972546839392");
});

test("an old, changed or made-up proof is refused", () => {
  const now = 1_800_000_000_000;
  const proof = makePhoneProof("+972546839392", now);
  assert.equal(readPhoneProof(proof, now + 31 * 60_000), null);
  assert.equal(readPhoneProof(proof.replace("+972546839392", "+972501111111"), now), null);
  assert.equal(readPhoneProof("+972501111111.9999999999999.abc", now), null);
  assert.equal(readPhoneProof("", now), null);
});

test("a new number's code key cannot look like an email", () => {
  assert.equal(phoneCodeKey("+972546839392").includes("@"), false);
});
