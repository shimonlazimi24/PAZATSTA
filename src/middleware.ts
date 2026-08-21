import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSigningSecret } from "@/lib/secrets";

const SESSION_COOKIE = "session";
const PUBLIC_PATHS = ["/", "/login", "/verify", "/welcome"];
const PUBLIC_PREFIXES = ["/api/auth", "/api/cron", "/login/", "/p/lesson-summary/"];

/** Paths whose HTML must never be cached by a CDN — they render per-user data. */
const PRIVATE_PREFIXES = ["/admin", "/teacher", "/student", "/parent", "/book"];

function isPublic(path: string): boolean {
  if (PUBLIC_PATHS.includes(path)) return true;
  return PUBLIC_PREFIXES.some((p) => path.startsWith(p));
}

function isPrivate(path: string): boolean {
  return PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Verify the cookie's HMAC signature at the edge.
 *
 * Checking only that a cookie exists let any forged value through to the layouts,
 * which then paid a database round trip to reject it. This does not replace the
 * per-request lookup in getUserFromSession — it just rejects garbage cheaply.
 */
async function hasValidSignature(signed: string, secret: string): Promise<boolean> {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return false;
  const value = signed.slice(0, idx);
  const providedHex = signed.slice(idx + 1);
  if (!/^[0-9a-f]{64}$/.test(providedHex)) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  const expectedHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time compare; both strings are fixed-length hex at this point.
  let diff = 0;
  for (let i = 0; i < expectedHex.length; i++) {
    diff |= expectedHex.charCodeAt(i) ^ providedHex.charCodeAt(i);
  }
  return diff === 0;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (path === "/welcome") {
    const res = NextResponse.redirect(new URL("/book", req.url));
    setNoStore(res);
    return res;
  }

  if (isPublic(path)) {
    const res = NextResponse.next();
    if (isPrivate(path)) setNoStore(res);
    return res;
  }

  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  let valid = false;
  if (raw) {
    try {
      // Uses the dev fallback locally and throws in production when the secret is
      // missing — in which case every cookie is treated as invalid, which is the
      // safe direction.
      valid = await hasValidSignature(raw, getSigningSecret());
    } catch (e) {
      console.error("[middleware] Cannot verify session signature:", e);
    }
  }

  const res = valid
    ? NextResponse.next()
    : NextResponse.redirect(new URL("/login", req.url));

  // Avoid CDN/edge caching HTML with stale /_next/static/* hashes after redeploy.
  // Only authenticated pages need this; public pages stay cacheable.
  if (!valid || isPrivate(path)) setNoStore(res);
  return res;
}

function setNoStore(res: NextResponse): void {
  res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate, max-age=0");
  res.headers.set("Pragma", "no-cache");
}

// DEPLOYMENT SAFETY: Never run middleware on /_next/*, /api/*, or static assets.
// Excluding these prevents accidental interception that could cause 404/MIME errors.
export const config = {
  matcher: [
    "/((?!_next|api|favicon\\.ico|logo\\.svg|robots\\.txt|sitemap\\.xml|fonts/).*)",
  ],
};
