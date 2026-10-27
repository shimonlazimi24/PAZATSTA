import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateCronAuth } from "@/lib/cron-auth";
import { sendDueApprovalReminders } from "@/lib/approval-reminders-run";

/** Every 15 minutes: remind teachers about lesson requests they have not approved. */
export async function GET(req: Request) {
  const authError = validateCronAuth(req);
  if (authError) return authError;
  const result = await sendDueApprovalReminders(prisma);
  console.info("[cron/approval-reminders]", JSON.stringify(result));
  return NextResponse.json({ ok: true, ...result });
}
