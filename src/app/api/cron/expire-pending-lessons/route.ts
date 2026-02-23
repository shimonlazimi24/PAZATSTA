import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const CRON_SECRET = process.env.CRON_SECRET;

/** Run every few minutes: cancel pending lessons past approvalExpiresAt and restore slots. */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const expired = await prisma.lesson.findMany({
    where: {
      status: "pending_approval",
      approvalExpiresAt: { lt: now },
    },
    select: { id: true, teacherId: true, date: true, startTime: true, endTime: true },
  });

  let restored = 0;
  for (const lesson of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.lesson.update({
          where: { id: lesson.id },
          data: { status: "canceled" },
        });
        await tx.availability.create({
          data: {
            teacherId: lesson.teacherId,
            date: lesson.date,
            startTime: lesson.startTime,
            endTime: lesson.endTime,
          },
        });
      });
      restored++;
    } catch (e) {
      console.error("[cron/expire-pending-lessons] Failed for lesson", lesson.id, e);
    }
  }

  return NextResponse.json({ ok: true, expired: expired.length, restored });
}
