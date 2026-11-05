import { test } from "node:test";
import assert from "node:assert/strict";
import { isPhoneOnlyEmail, phoneCodeKey, phoneOnlyEmail } from "../src/lib/phone-only";
import { isValidDeliveryEmail } from "../src/lib/validation";

test("a phone-only student gets a stand-in address that names the number", () => {
  assert.equal(phoneOnlyEmail("972546839392"), "phone-0546839392@no-email.invalid");
  assert.equal(isPhoneOnlyEmail(phoneOnlyEmail("972546839392")), true);
  assert.equal(isPhoneOnlyEmail("dana@gmail.com"), false);
  assert.equal(isPhoneOnlyEmail(null), false);
});

test("the stand-in address is never treated as a real mailbox", () => {
  assert.equal(isValidDeliveryEmail(phoneOnlyEmail("972546839392")), false);
  assert.equal(isValidDeliveryEmail("dana@gmail.com"), true);
});

test("a new number's code key cannot look like an email", () => {
  assert.equal(phoneCodeKey("972546839392").includes("@"), false);
});
