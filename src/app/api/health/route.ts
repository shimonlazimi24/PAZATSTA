import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
    process.env.VERCEL_GIT_COMMIT_REF ??
    "unknown";

  return NextResponse.json({
    ok: true,
    version,
    time: new Date().toISOString(),
  });
}
