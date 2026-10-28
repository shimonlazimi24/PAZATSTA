import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeState, emailFromIdToken, encodeState, googleAuthUrl, googleConfig } from "../src/lib/google-login";

const CLIENT = "client-123.apps.googleusercontent.com";
const NOW = 1_800_000_000;
const token = (claims: Record<string, unknown>) =>
  `x.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;
const good = { aud: CLIENT, iss: "https://accounts.google.com", exp: NOW + 600, email: "Dana@Gmail.com", email_verified: true };

test("a valid Google token gives the verified email, lower-cased", () => {
  assert.equal(emailFromIdToken(token(good), CLIENT, NOW), "dana@gmail.com");
});

test("a token for another app, from another issuer, expired or with an unverified email is refused", () => {
  assert.equal(emailFromIdToken(token({ ...good, aud: "other" }), CLIENT, NOW), null);
  assert.equal(emailFromIdToken(token({ ...good, iss: "https://evil.example" }), CLIENT, NOW), null);
  assert.equal(emailFromIdToken(token({ ...good, exp: NOW - 1 }), CLIENT, NOW), null);
  assert.equal(emailFromIdToken(token({ ...good, email_verified: false }), CLIENT, NOW), null);
  assert.equal(emailFromIdToken("garbage", CLIENT, NOW), null);
});

test("the login state survives the round trip and cannot carry an outside redirect", () => {
  const nonce = "n".repeat(32);
  assert.deepEqual(decodeState(encodeState({ nonce, role: "teacher", next: "/admin" })), { nonce, role: "teacher", next: "/admin" });
  assert.equal(decodeState(encodeState({ nonce, role: "student", next: "//evil.com" }))?.next, "");
  assert.equal(decodeState("not-base64-json"), null);
  assert.equal(decodeState(encodeState({ nonce: "short", role: "student", next: "" })), null);
});

test("Google login is on only when both keys are set", () => {
  assert.equal(googleConfig({ GOOGLE_CLIENT_ID: CLIENT }), null);
  assert.deepEqual(googleConfig({ GOOGLE_CLIENT_ID: CLIENT, GOOGLE_CLIENT_SECRET: "s" }), { clientId: CLIENT, clientSecret: "s" });
});

test("the Google link asks only for the email and lets the person pick an account", () => {
  const u = new URL(googleAuthUrl({ clientId: CLIENT, redirectUri: "https://x.test/api/auth/google/callback", state: "abc" }));
  assert.equal(u.searchParams.get("scope"), "openid email");
  assert.equal(u.searchParams.get("prompt"), "select_account");
  assert.equal(u.searchParams.get("state"), "abc");
});
