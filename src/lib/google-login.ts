/**
 * Log in with Google (OAuth 2.0 authorization code flow, no extra library).
 *
 * Turned on by GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. Google only proves the
 * person owns an email address; who may enter, and as what, is decided exactly
 * as for a one-time code (see complete-login.ts).
 */

export type GoogleRole = "student" | "teacher" | "admin";

type Env = Record<string, string | undefined>;

export const GOOGLE_STATE_COOKIE = "g_login";

export function googleConfig(env: Env = process.env): { clientId: string; clientSecret: string } | null {
  const clientId = env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function callbackUrl(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

export function googleAuthUrl(params: { clientId: string; redirectUri: string; state: string }): string {
  const q = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: "code",
    scope: "openid email",
    state: params.state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

export type LoginState = { nonce: string; role: GoogleRole; next: string };

export function encodeState(s: LoginState): string {
  return Buffer.from(JSON.stringify(s)).toString("base64url");
}

export function decodeState(raw: string | null | undefined): LoginState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (typeof v?.nonce !== "string" || v.nonce.length < 16) return null;
    const role: GoogleRole = v.role === "teacher" || v.role === "admin" ? v.role : "student";
    const next = typeof v.next === "string" && v.next.startsWith("/") && !v.next.startsWith("//") ? v.next : "";
    return { nonce: v.nonce, role, next };
  } catch {
    return null;
  }
}

/**
 * Reads the verified email from an ID token that came straight from Google's
 * token endpoint over TLS. Google documents that such a token needs no separate
 * signature check, but its audience, issuer, expiry and email_verified must be
 * checked, and they are here.
 */
export function emailFromIdToken(idToken: string, clientId: string, nowSeconds: number): string | null {
  const part = idToken.split(".")[1];
  if (!part) return null;
  let c: { aud?: unknown; iss?: unknown; exp?: unknown; email?: unknown; email_verified?: unknown };
  try {
    c = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (c.aud !== clientId) return null;
  if (c.iss !== "https://accounts.google.com" && c.iss !== "accounts.google.com") return null;
  if (typeof c.exp !== "number" || c.exp < nowSeconds) return null;
  if (c.email_verified !== true && c.email_verified !== "true") return null;
  if (typeof c.email !== "string" || !c.email.includes("@")) return null;
  return c.email.trim().toLowerCase();
}

/** Short Hebrew messages for the login screen, keyed by ?google= in the URL. */
export const GOOGLE_ERRORS: Record<string, string> = {
  cancelled: "הכניסה עם Google בוטלה. אפשר לנסות שוב או להתחבר עם קוד.",
  expired: "עבר יותר מדי זמן. נסו שוב להתחבר עם Google.",
  failed: "הכניסה עם Google לא הצליחה. נסו שוב או התחברו עם קוד.",
  off: "כניסה עם Google לא זמינה כרגע. התחברו עם קוד.",
  teacher: "חשבון Google הזה לא רשום כמורה. התחברו עם המייל ששמור אצלנו, או פנו לאדמין.",
  admin: "לחשבון Google הזה אין הרשאת ניהול.",
  student: "חשבון Google הזה רשום כמורה. היכנסו דרך \"התחבר כמורה\".",
};
