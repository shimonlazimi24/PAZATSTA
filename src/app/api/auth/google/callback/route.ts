import crypto from "crypto";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSessionCookieConfig, sign, unsign } from "@/lib/auth";
import { completeLogin } from "@/lib/complete-login";
import { GOOGLE_STATE_COOKIE, callbackUrl, decodeState, emailFromIdToken, googleConfig } from "@/lib/google-login";
import { maskEmail } from "@/lib/login-messages";

export const dynamic = "force-dynamic";

const LOGIN_PAGE = { student: "/login/student", teacher: "/login/teacher", admin: "/login/admin" } as const;

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Google sends the person back here with a one-time code. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cookie = req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(`${GOOGLE_STATE_COOKIE}=`));
  const raw = cookie ? unsign(decodeURIComponent(cookie.slice(GOOGLE_STATE_COOKIE.length + 1))) : null;
  const state = decodeState(raw);

  const back = (page: string, reason: string) => {
    const res = NextResponse.redirect(new URL(`${page}?google=${reason}`, url.origin));
    res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
    return res;
  };

  if (!state) return back("/login", "expired");
  const page = LOGIN_PAGE[state.role];
  if (url.searchParams.get("error")) return back(page, "cancelled");
  const code = url.searchParams.get("code");
  const returned = url.searchParams.get("state") ?? "";
  if (!code || !sameString(returned, state.nonce)) return back(page, "expired");

  const cfg = googleConfig();
  if (!cfg) return back(page, "off");

  let email: string | null = null;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: callbackUrl(url.origin),
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await tokenRes.json().catch(() => null)) as { id_token?: string; error?: string } | null;
    if (!tokenRes.ok || !data?.id_token) {
      console.error("[google-login] token exchange failed:", tokenRes.status, data?.error ?? "");
      return back(page, "failed");
    }
    email = emailFromIdToken(data.id_token, cfg.clientId, Math.floor(Date.now() / 1000));
  } catch (e) {
    console.error("[google-login] token exchange error:", (e as Error)?.message ?? e);
    return back(page, "failed");
  }
  if (!email) {
    console.warn("[google-login] rejected: id token checks failed");
    return back(page, "failed");
  }

  const outcome = await completeLogin({ email, role: state.role, next: state.next || undefined });
  if (!outcome.ok) {
    console.warn("[google-login] rejected:", state.role, maskEmail(email));
    return back(page, state.role);
  }
  const res = NextResponse.redirect(new URL(outcome.redirect, url.origin));
  res.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
  res.cookies.set(SESSION_COOKIE, sign(outcome.sessionId), getSessionCookieConfig());
  return res;
}
