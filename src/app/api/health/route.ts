import { NextResponse } from "next/server";
import { missingConfig } from "@/lib/config-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.VERCEL_GIT_COMMIT_REF ??
    "unknown";

  const missing = process.env.NODE_ENV === "production" ? missingConfig() : [];

  // Which specific variables are unset is reconnaissance, so the public response
  // carries only a boolean. Naming them requires the cron secret.
  const cronSecret = process.env.CRON_SECRET;
  const authorized =
    !!cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`;

  return NextResponse.json({
    ok: true,
    version,
    time: new Date().toISOString(),
    configOk: missing.length === 0,
    ...(authorized ? { missingConfig: missing } : {}),
  });
}
