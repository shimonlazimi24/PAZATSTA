import { NextResponse } from "next/server";
import { verifyRelay } from "@/lib/sms-relay";
import { sendSmsDirect } from "@/lib/sms";
import { maskPhone } from "@/lib/phone";

// 019 only accepts API calls from Israel, Europe and North America, and the
// rest of the site runs in Seoul. This route runs in Frankfurt and does the
// actual sending. It touches no database, so its region costs nothing.
export const preferredRegion = "fra1";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 20;

/** Accepts only requests signed by our own servers (see src/lib/sms-relay.ts). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const ok = body ? verifyRelay(body) : null;
  if (!ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    await sendSmsDirect(ok.to, ok.text);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sms-relay] send failed:", maskPhone(ok.to), process.env.VERCEL_REGION, (e as Error)?.message ?? e);
    return NextResponse.json({ error: "send failed" }, { status: 502 });
  }
}
