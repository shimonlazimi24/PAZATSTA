import crypto from "crypto";
import { NextResponse } from "next/server";
import { sign } from "@/lib/auth";
import { GOOGLE_STATE_COOKIE, callbackUrl, encodeState, googleAuthUrl, googleConfig } from "@/lib/google-login";

export const dynamic = "force-dynamic";

/** Sends the person to Google, remembering which login screen they came from. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const cfg = googleConfig();
  if (!cfg) return NextResponse.redirect(new URL("/login?google=off", url.origin));

  const roleParam = url.searchParams.get("role");
  const role = roleParam === "teacher" || roleParam === "admin" ? roleParam : "student";
  const nextParam = url.searchParams.get("next") ?? "";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "";
  const nonce = crypto.randomBytes(24).toString("base64url");

  const res = NextResponse.redirect(
    googleAuthUrl({ clientId: cfg.clientId, redirectUri: callbackUrl(url.origin), state: nonce })
  );
  // Signed and httpOnly: the callback trusts only what this cookie says.
  res.cookies.set(GOOGLE_STATE_COOKIE, sign(encodeState({ nonce, role, next })), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  return res;
}
