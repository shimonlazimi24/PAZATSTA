import { NextResponse } from "next/server";

const CRON_SECRET = process.env.CRON_SECRET;
const isProd = process.env.NODE_ENV === "production";

/** Validate cron auth. Returns 401/503 response if unauthorized, null if OK. */
export function validateCronAuth(req: Request): NextResponse | null {
  if (isProd && !CRON_SECRET) {
    console.error("[cron] CRON_SECRET not set in production");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
