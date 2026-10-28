import { test } from "node:test";
import assert from "node:assert/strict";
import { displayIsraeliMobile, maskPhone, normalizeIsraeliMobile } from "../src/lib/phone";
import { smsMode } from "../src/lib/sms";
import { LOGIN_MESSAGES, requestPhoneCodeErrorMessage } from "../src/lib/login-messages";

test("every common way of writing an Israeli mobile becomes the same number", () => {
  for (const raw of ["050-1234567", "0501234567", "050 123 4567", "+972501234567", "972-50-1234567", "+972 (0)50-1234567", "501234567", "‏050-1234567"]) {
    assert.equal(normalizeIsraeliMobile(raw), "972501234567", raw);
  }
});

test("landlines, short numbers and text are not mobiles", () => {
  for (const raw of ["03-1234567", "05012345", "050123456789", "", "abc", "+1 555 123 4567"]) {
    assert.equal(normalizeIsraeliMobile(raw), null, raw);
  }
});

test("a number is shown and logged in a readable, partly hidden form", () => {
  assert.equal(displayIsraeliMobile("972501234567"), "050-1234567");
  assert.equal(maskPhone("972501234567"), "050-***4567");
});

test("production offers phone login only once an SMS provider is connected", () => {
  assert.equal(smsMode({ VERCEL_ENV: "production", NODE_ENV: "production" }), "off");
  assert.equal(smsMode({ VERCEL_ENV: "preview", NODE_ENV: "production", EMAIL_REDIRECT_TO: "qa@example.com" }), "email-fallback");
  assert.equal(smsMode({ APP_ENV: "staging", VERCEL_ENV: "production", NODE_ENV: "production", EMAIL_REDIRECT_TO: "qa@example.com" }), "email-fallback");
  assert.equal(smsMode({ NODE_ENV: "development" }), "email-fallback");
});

test("each phone failure gets its own plain message", () => {
  assert.equal(requestPhoneCodeErrorMessage(400), LOGIN_MESSAGES.invalidPhone);
  assert.equal(requestPhoneCodeErrorMessage(404), LOGIN_MESSAGES.phoneNotFound);
  assert.equal(requestPhoneCodeErrorMessage(409), LOGIN_MESSAGES.phoneSeveral);
  assert.equal(requestPhoneCodeErrorMessage(403), LOGIN_MESSAGES.phoneOff);
  assert.equal(requestPhoneCodeErrorMessage(429), LOGIN_MESSAGES.rateLimited);
  assert.equal(requestPhoneCodeErrorMessage(0), LOGIN_MESSAGES.offline);
});

test("phone login turns on in production once 019 is fully configured, not before", () => {
  const prod = { VERCEL_ENV: "production", NODE_ENV: "production", SMS_PROVIDER: "019" };
  assert.equal(smsMode({ ...prod, SMS_019_USERNAME: "u", SMS_019_TOKEN: "t" }), "off");
  assert.equal(smsMode({ ...prod, SMS_019_USERNAME: "u", SMS_019_TOKEN: "t", SMS_SENDER: "Pazatsta" }), "provider");
});
