import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronAuth } from "@/lib/cron-auth";
import { runGroupLessonNotices } from "@/lib/group-lessons-run";
import { generateWeeklyLessons } from "@/lib/group-lessons-weekly";

/** Leaves room for a slow email provider; the default can cut a run short. */
export const maxDuration = 60;

/** Daily: create the weekly lessons ahead, then sign-up notices and day-before reminders. */
export async function GET(req: Request) {
  const authError = validateCronAuth(req);
  if (authError) return authError;
  // First, so the monthly sign-up notice already sees next month's weekly lessons.
  const created = await generateWeeklyLessons(prisma).catch((e) => {
    console.error("[cron/group-lessons] weekly lessons failed", e);
    return 0;
  });
  const result = { weeklyCreated: created, ...(await runGroupLessonNotices(prisma)) };
  console.info("[cron/group-lessons]", JSON.stringify(result));
  return NextResponse.json({ ok: true, ...result });
}
