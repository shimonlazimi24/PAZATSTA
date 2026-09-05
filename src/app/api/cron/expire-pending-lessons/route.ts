import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronAuth } from "@/lib/cron-auth";
import { expireOverduePendingLessons } from "@/lib/expire-pending-lessons";

/**
 * Hourly maintenance: cancel pending lessons past approvalExpiresAt and restore
 * their slots, then sweep rows that have outlived their usefulness. Nothing else
 * deletes expired sessions or login codes, so they accumulate forever.
 */
export async function GET(req: Request) {
  const authError = validateCronAuth(req);
  if (authError) return authError;

  const { expired, restored } = await expireOverduePendingLessons(prisma);

  const now = new Date();
  const [sessions, loginCodes] = await Promise.all([
    prisma.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.loginCode.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  return NextResponse.json({
    ok: true,
    expired,
    restored,
    sweptSessions: sessions.count,
    sweptLoginCodes: loginCodes.count,
  });
}
