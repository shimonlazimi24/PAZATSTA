import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { sendDueApprovalReminders } from "@/lib/approval-reminders-run";

/** Admin "send due reminders now" — the same run the scheduled job does. */
export async function POST() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  const result = await sendDueApprovalReminders(prisma);
  return NextResponse.json({ ok: true, ...result });
}
