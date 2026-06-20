import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronAuth } from "@/lib/cron-auth";
import { expireOverduePendingLessons } from "@/lib/expire-pending-lessons";

/** Cancel pending lessons past approvalExpiresAt and restore slots. */
export async function GET(req: Request) {
  const authError = validateCronAuth(req);
  if (authError) return authError;

  const { expired, restored } = await expireOverduePendingLessons(prisma);

  return NextResponse.json({ ok: true, expired, restored });
}
