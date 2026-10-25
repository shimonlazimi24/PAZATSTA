import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEmailInput,
  requestCodeErrorMessage,
  verifyCodeErrorMessage,
  sentHint,
  maskEmail,
  LOGIN_MESSAGES,
} from "../src/lib/login-messages";
import { EMAIL_REGEX } from "../src/lib/validation";

test("an address pasted with a right-to-left mark becomes valid", () => {
  // Copying from Hebrew text often carries U+200F; the server used to reject it.
  const pasted = "‏dalitw1@walla.com";
  assert.equal(EMAIL_REGEX.test(pasted.trim()), true, "the old check let it through…");
  assert.equal(normalizeEmailInput(pasted), "dalitw1@walla.com", "…but the mark must not reach Resend");
});

test("invisible characters are removed anywhere in the address", () => {
  assert.equal(normalizeEmailInput("dalit​w1@walla.com"), "dalitw1@walla.com");
  assert.equal(normalizeEmailInput("‫dalitw1@walla.com‬"), "dalitw1@walla.com");
  assert.equal(normalizeEmailInput("﻿a@b.co"), "a@b.co");
});

test("edge spaces, including non-breaking ones, are trimmed and case folded", () => {
  assert.equal(normalizeEmailInput("  Dalitw1@Walla.com "), "dalitw1@walla.com");
});

test("a space inside the address is kept, so it fails visibly rather than changing address", () => {
  const typed = normalizeEmailInput("dalit w1@walla.com");
  assert.equal(typed, "dalit w1@walla.com");
  assert.equal(EMAIL_REGEX.test(typed), false);
});

test("each failure status maps to its own user message", () => {
  assert.equal(requestCodeErrorMessage(400), LOGIN_MESSAGES.invalidEmail);
  assert.equal(requestCodeErrorMessage(429), LOGIN_MESSAGES.rateLimited);
  assert.equal(requestCodeErrorMessage(0), LOGIN_MESSAGES.offline);
  for (const status of [500, 502, 503, 404, 418]) {
    assert.equal(requestCodeErrorMessage(status), LOGIN_MESSAGES.temporary);
  }
});

test("no user-facing message contains Latin letters", () => {
  // Server text such as "Network error" or "Failed to send code" must never surface.
  for (const message of Object.values(LOGIN_MESSAGES)) {
    assert.doesNotMatch(message, /[A-Za-z]/, message);
  }
});

test("verify errors hide server failures but keep the Hebrew 4xx explanations", () => {
  assert.equal(verifyCodeErrorMessage(0, "Network error"), LOGIN_MESSAGES.offline);
  assert.equal(verifyCodeErrorMessage(500, "Verification failed"), LOGIN_MESSAGES.temporary);
  assert.equal(verifyCodeErrorMessage(400, "קוד שגוי"), "קוד שגוי");
});

test("the sent hint names the address so a typo can be spotted", () => {
  assert.match(sentHint("amitshlmom35@gmail.com"), /amitshlmom35@gmail\.com/);
});

test("masked emails keep the domain and hide the name", () => {
  assert.equal(maskEmail("dalitw1@walla.com"), "da***@walla.com");
  assert.equal(maskEmail("a@b.co"), "a***@b.co");
  assert.equal(maskEmail("no-at-sign"), "***");
});
