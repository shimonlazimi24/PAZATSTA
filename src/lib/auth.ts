import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./db";
import { getSigningSecret } from "./secrets";
import type { Role } from "@/types";

const SESSION_COOKIE = "session";
const SESSION_TTL_DAYS = 14;
/** 32 random bytes; the session token is a secret, not a database identifier. */
const SESSION_TOKEN_BYTES = 32;

function sign(value: string): string {
  const hmac = crypto.createHmac("sha256", getSigningSecret());
  hmac.update(value);
  return `${value}.${hmac.digest("hex")}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const expected = sign(value);
  // Constant-time compare so the signature cannot be recovered byte by byte.
  const a = Buffer.from(signed, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return value;
}

export function createSessionToken(): string {
  return crypto.randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

/** Create a session row and return the signed cookie value for it. */
export async function createSession(userId: string): Promise<string> {
  const token = createSessionToken();
  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

export async function getUserFromSession(): Promise<{
  id: string;
  email: string;
  role: Role;
  name: string | null;
} | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const token = unsign(raw);
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role as Role,
    name: session.user.name,
  };
}

/** Invalidate every session for a user. Call after a role change. */
export async function revokeSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

const SESSION_MAX_AGE_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

export function getSessionCookieConfig() {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
  };
  const domain = process.env.COOKIE_DOMAIN?.trim();
  return domain ? { ...base, domain } : base;
}

export { SESSION_COOKIE, sign, unsign };
export type { Role };
