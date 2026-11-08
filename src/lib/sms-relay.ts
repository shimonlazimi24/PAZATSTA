import crypto from "crypto";
import { getSigningSecret } from "@/lib/secrets";

/**
 * 019 accepts API calls only from Israel, Europe and North America. The site
 * runs in Seoul (next to the database), so the SMS itself is sent from a small
 * route pinned to Frankfurt: /api/internal/sms. These helpers sign the hand-off
 * so nobody else can use that route to send messages.
 */

/** Vercel regions 019 lets through: Europe and North America. */
const ALLOWED_REGION = /^(fra|cdg|lhr|arn|dub|iad|cle|pdx|sfo|yul)\d$/;

/** True when this server must hand the SMS to the Frankfurt route instead of calling 019 itself. */
export function needsRelay(env: Record<string, string | undefined> = process.env): boolean {
  const region = env.VERCEL_REGION?.trim();
  return Boolean(region) && !ALLOWED_REGION.test(region!);
}

const MAX_AGE_MS = 60_000;

function mac(ts: string, to: string, text: string): string {
  return crypto.createHmac("sha256", getSigningSecret()).update(`sms-relay:${ts}:${to}:${text}`).digest("hex");
}

export function signRelay(to: string, text: string, now = Date.now()) {
  const ts = String(now);
  return { to, text, ts, sig: mac(ts, to, text) };
}

/** Checks a relay request: a fresh timestamp and a signature only our servers can make. */
export function verifyRelay(body: { to?: unknown; text?: unknown; ts?: unknown; sig?: unknown }, now = Date.now()): { to: string; text: string } | null {
  const { to, text, ts, sig } = body;
  if (typeof to !== "string" || typeof text !== "string" || typeof ts !== "string" || typeof sig !== "string") return null;
  if (!/^\d{12}$/.test(to) || text.length > 500) return null;
  const age = now - Number(ts);
  if (!(age >= -5_000 && age <= MAX_AGE_MS)) return null;
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(mac(ts, to, text), "utf8");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return { to, text };
}

/** Where the Frankfurt route lives for this deployment, and any header needed to reach it. */
export function relayTarget(env: Record<string, string | undefined> = process.env): { url: string; headers: Record<string, string> } | null {
  const host = env.VERCEL_ENV === "production" ? env.VERCEL_PROJECT_PRODUCTION_URL : env.VERCEL_URL;
  if (!host) return null;
  const headers: Record<string, string> = {};
  // Preview deployments sit behind Vercel's login; the bypass secret lets our own server through.
  if (env.VERCEL_ENV !== "production" && env.VERCEL_AUTOMATION_BYPASS_SECRET) {
    headers["x-vercel-protection-bypass"] = env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
  return { url: `https://${host}/api/internal/sms`, headers };
}
