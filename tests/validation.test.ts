import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isValidEmail,
  isValidPhone,
  isValidDeliveryEmail,
  normalizePhoneDigits,
} from "../src/lib/validation";

test("isValidEmail accepts ordinary addresses and rejects malformed ones", () => {
  assert.equal(isValidEmail("a@b.co"), true);
  assert.equal(isValidEmail("  spaced@example.com  "), true, "trims before testing");
  assert.equal(isValidEmail("no-at-sign"), false);
  assert.equal(isValidEmail("no@tld"), false);
  assert.equal(isValidEmail("two spaces@example.com"), false);
  assert.equal(isValidEmail(""), false);
});

test("isValidDeliveryEmail additionally rejects undeliverable domains", () => {
  assert.equal(isValidDeliveryEmail("real@example.co.il"), true);
  assert.equal(isValidDeliveryEmail("dev@machine.local"), false);
  assert.equal(isValidDeliveryEmail("root@localhost"), false);
  assert.equal(isValidDeliveryEmail("qa@something.test"), false);
  assert.equal(isValidDeliveryEmail("someone@foo.example"), false);
});

test("isValidPhone counts digits, ignoring formatting", () => {
  assert.equal(isValidPhone("050-263-2320"), true);
  assert.equal(isValidPhone("+972 50 2632320"), true);
  assert.equal(isValidPhone("12345678"), false, "8 digits is too short");
  assert.equal(isValidPhone("123456789012"), false, "12 digits is too long");
});

test("normalizePhoneDigits maps the international form to the local one", () => {
  assert.equal(normalizePhoneDigits("+972-50-2632320"), "0502632320");
  assert.equal(normalizePhoneDigits("050-2632320"), "0502632320");
  assert.equal(normalizePhoneDigits("0972123456"), "0972123456", "a local number starting with 0 is left alone");
});
