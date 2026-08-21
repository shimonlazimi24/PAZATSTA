import { NextResponse } from "next/server";
import crypto from "crypto";

/** Timing-safe comparison of two short ASCII strings. */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validate cron auth. Returns a response if unauthorized, null if OK.
 *
 * The secret is required in every environment. Making the check conditional on the
 * secret being set left cron endpoints wide open wherever it was not configured —
 * preview deployments included.
 */
export function validateCronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron] CRON_SECRET not set — refusing to run");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
