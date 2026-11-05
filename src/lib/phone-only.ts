import crypto from "crypto";
import { getSigningSecret } from "./secrets";

/**
 * A new student logging in by SMS: the number is not on any account yet, so the
 * code is stored under this key instead of an email.
 */
export function phoneCodeKey(normalized: string): string {
  return `phone:${normalized}`;
}

const PROOF_TTL_MS = 30 * 60 * 1000;

function mac(value: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(`phone-proof:${value}`).digest("hex");
}

/**
 * Proof that this browser just confirmed the number with an SMS code. It lets
 * the email step that follows save the number on the account, without a second SMS.
 */
export function makePhoneProof(normalized: string, now = Date.now()): string {
  const value = `${normalized}.${now + PROOF_TTL_MS}`;
  return `${value}.${mac(value)}`;
}

/** The confirmed number, or null when the proof is forged or too old. */
export function readPhoneProof(token: string, now = Date.now()): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [normalized, exp, sig] = parts;
  const expected = mac(`${normalized}.${exp}`);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (!(Number(exp) > now)) return null;
  return normalized;
}
