import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public list of upcoming workshops (for booking). */
export async function GET() {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const rows = await prisma.workshop.findMany({
    where: { date: { gte: startOfToday } },
    orderBy: [{ date: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      date: true,
      maxParticipants: true,
      startTime: true,
      endTime: true,
      topicLabel: true,
      generalDescription: true,
      teacher: {
        select: {
          id: true,
          name: true,
          email: true,
          teacherProfile: { select: { displayName: true } },
        },
      },
    },
  });

  const ids = rows.map((w) => w.id);
  const bookedRows =
    ids.length === 0
      ? []
      : await prisma.lesson.groupBy({
          by: ["workshopId"],
          where: {
            workshopId: { in: ids },
            status: { not: "canceled" },
          },
          _count: { _all: true },
        });
  const bookedByWorkshopId = new Map(
    bookedRows.map((r) => [r.workshopId!, r._count._all] as const)
  );

  const withCounts = rows.map((w) => {
    const booked = bookedByWorkshopId.get(w.id) ?? 0;
    const spotsLeft = Math.max(0, w.maxParticipants - booked);
    return {
      id: w.id,
      name: w.name,
      date: w.date.toISOString().slice(0, 10),
      maxParticipants: w.maxParticipants,
      booked,
      spotsLeft,
      startTime: w.startTime,
      endTime: w.endTime,
      topicLabel: w.topicLabel,
      generalDescription: w.generalDescription ?? null,
      teacherName:
        w.teacher.teacherProfile?.displayName?.trim() ||
        w.teacher.name?.trim() ||
        w.teacher.email ||
        "מורה",
    };
  });

  return NextResponse.json(withCounts, {
    headers: { "Cache-Control": "no-store" },
  });
}
