import crypto from "crypto";

const OTP_LENGTH = 6;
const SALT = process.env.COOKIE_SECRET || "fallback-salt-min-32-chars";

export function createOTP(): string {
  const digits = crypto.randomInt(0, 1_000_000);
  return digits.toString().padStart(OTP_LENGTH, "0");
}

export function hashOTP(code: string): string {
  return crypto.createHmac("sha256", SALT).update(code).digest("hex");
}

export function verifyOTP(code: string, codeHash: string): boolean {
  const computed = hashOTP(code);
  if (computed.length !== codeHash.length) return false;
  const a = Buffer.from(computed, "utf8");
  const b = Buffer.from(codeHash, "utf8");
  return crypto.timingSafeEqual(a, b);
}
