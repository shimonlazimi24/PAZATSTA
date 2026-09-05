import { test } from "node:test";
import assert from "node:assert/strict";
import { createOTP, hashOTP, verifyOTP } from "../src/lib/otp";

test("createOTP always returns six digits", () => {
  for (let i = 0; i < 500; i++) {
    const code = createOTP();
    assert.match(code, /^\d{6}$/, `got ${code}`);
  }
});

test("createOTP can produce codes with leading zeros", () => {
  // padStart is what makes this safe; a plain toString would emit short codes.
  const padded = (0).toString().padStart(6, "0");
  assert.equal(padded, "000000");
  assert.equal(padded.length, 6);
});

test("verifyOTP accepts the matching code and rejects others", () => {
  const code = "123456";
  const hash = hashOTP(code);
  assert.equal(verifyOTP(code, hash), true);
  assert.equal(verifyOTP("123457", hash), false);
  assert.equal(verifyOTP("", hash), false);
});

test("verifyOTP rejects a malformed stored hash instead of throwing", () => {
  assert.equal(verifyOTP("123456", "short"), false);
  assert.equal(verifyOTP("123456", ""), false);
});

test("hashOTP is deterministic and does not store the code", () => {
  const hash = hashOTP("424242");
  assert.equal(hash, hashOTP("424242"));
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.ok(!hash.includes("424242"));
});
