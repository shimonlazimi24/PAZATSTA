import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma } from "./db";
import type { Role } from "@/types";

const SESSION_COOKIE = "session";
const SESSION_TTL_DAYS = 14;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const isProd = process.env.NODE_ENV === "production";

function getCookieSecret(): string {
  if (COOKIE_SECRET && COOKIE_SECRET.length >= 32) return COOKIE_SECRET;
  if (isProd) {
    console.warn("[auth] COOKIE_SECRET not set in production – using fallback. Set COOKIE_SECRET (min 32 chars) for security.");
  }
  return "fallback-dev-only-min-32-characters";
}

function sign(value: string): string {
  const hmac = crypto.createHmac("sha256", getCookieSecret());
  hmac.update(value);
  return `${value}.${hmac.digest("hex")}`;
}

function unsign(signed: string): string | null {
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return null;
  const value = signed.slice(0, idx);
  const expected = sign(value);
  if (signed !== expected) return null;
  return value;
}

export async function createSession(userId: string): Promise<string> {
  const session = await prisma.session.create({
    data: {
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000),
    },
  });
  return session.id;
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
  const sessionId = unsign(raw);
  if (!sessionId) return null;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
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

export function getSessionCookieConfig() {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  };
  const domain = process.env.COOKIE_DOMAIN?.trim();
  return domain ? { ...base, domain } : base;
}

export { SESSION_COOKIE, sign, unsign };
export type { Role };
