import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** GET ?start=YYYY-MM-DD&end=YYYY-MM-DD — lessons in range for admin weekly board. */
export async function GET(req: Request) {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get("start");
  const endStr = searchParams.get("end");
  if (!startStr || !endStr) {
    return NextResponse.json({ error: "start and end (YYYY-MM-DD) required" }, { status: 400 });
  }
  const start = new Date(startStr + "T00:00:00.000Z");
  const end = new Date(endStr + "T23:59:59.999Z");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      date: { gte: start, lte: end },
      status: { in: ["pending_approval", "scheduled", "completed"] },
    },
    include: {
      teacher: { select: { id: true, email: true, name: true } },
      student: { select: { id: true, email: true, name: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(
    lessons.map((l) => ({
      id: l.id,
      date: l.date.toISOString().slice(0, 10),
      startTime: l.startTime,
      endTime: l.endTime,
      status: l.status,
      reportCompleted: l.reportCompleted,
      teacher: l.teacher,
      student: l.student,
    }))
  );
}
