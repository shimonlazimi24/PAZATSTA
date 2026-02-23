import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { formatDateInIsrael } from "@/lib/date-utils";

export async function GET() {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const now = new Date();
  const lessons = await prisma.lesson.findMany({
    where: {
      status: "pending_approval",
      approvalExpiresAt: { gt: now },
    },
    include: {
      teacher: { select: { id: true, email: true, name: true } },
      student: { select: { id: true, email: true, name: true } },
    },
    orderBy: [{ approvalExpiresAt: "asc" }, { date: "asc" }, { startTime: "asc" }],
  });
  return NextResponse.json(
    lessons.map((l) => ({
      id: l.id,
      date: formatDateInIsrael(l.date),
      startTime: l.startTime,
      endTime: l.endTime,
      approvalExpiresAt: l.approvalExpiresAt?.toISOString() ?? null,
      teacher: l.teacher,
      student: l.student,
    }))
  );
}
