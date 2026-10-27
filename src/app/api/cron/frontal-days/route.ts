import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronAuth } from "@/lib/cron-auth";
import { runFrontalDayNotices } from "@/lib/frontal-days-run";

/** Daily: frontal-day reminders to teachers and "no teachers yet" warnings to admins. */
export async function GET(req: Request) {
  const authError = validateCronAuth(req);
  if (authError) return authError;
  const result = await runFrontalDayNotices(prisma);
  console.info("[cron/frontal-days]", JSON.stringify(result));
  return NextResponse.json({ ok: true, ...result });
}
