import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronAuth } from "@/lib/cron-auth";
import { runGroupLessonNotices } from "@/lib/group-lessons-run";

/** Daily: group-lesson sign-up notices and day-before reminders. */
export async function GET(req: Request) {
  const authError = validateCronAuth(req);
  if (authError) return authError;
  const result = await runGroupLessonNotices(prisma);
  console.info("[cron/group-lessons]", JSON.stringify(result));
  return NextResponse.json({ ok: true, ...result });
}
