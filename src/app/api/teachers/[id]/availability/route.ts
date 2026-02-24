import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseDateParam } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherId } = await params;
    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: "teacher" },
    });
    if (!teacher) {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    const now = new Date();
    let effectiveStart: Date = now;
    let effectiveEnd: Date | null = null;

    if (startParam != null && endParam != null) {
      const parsedStart = parseDateParam(startParam);
      const parsedEnd = parseDateParam(endParam);
      if (!parsedStart) {
        return NextResponse.json(
          { error: "Invalid start date. Use YYYY-MM-DD." },
          { status: 400 }
        );
      }
      if (!parsedEnd) {
        return NextResponse.json(
          { error: "Invalid end date. Use YYYY-MM-DD." },
          { status: 400 }
        );
      }
      if (parsedStart.getTime() > parsedEnd.getTime()) {
        return NextResponse.json(
          { error: "Start date must be before or equal to end date." },
          { status: 400 }
        );
      }
      const startStr = typeof startParam === "string" ? startParam.trim() : "";
      const endStr = typeof endParam === "string" ? endParam.trim() : "";
      effectiveStart = new Date(startStr + "T00:00:00.000Z");
      effectiveEnd = new Date(endStr + "T23:59:59.999Z");
    }

    // Slots are stored with date at midnight UTC (day-only). Exclude only past days, not same-day:
    // use start-of-today UTC as minimum so slots for today are included.
    const startOfTodayUTC = new Date(now);
    startOfTodayUTC.setUTCHours(0, 0, 0, 0);
    const from =
      effectiveEnd != null && effectiveStart < startOfTodayUTC
        ? startOfTodayUTC
        : effectiveStart;
    const dateWhere =
      effectiveEnd != null ? { gte: from, lte: effectiveEnd } : { gte: startOfTodayUTC };

    const toDateStr = (d: Date) =>
      d.toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

    const [slots, takenLessons] = await Promise.all([
      prisma.availability.findMany({
        where: {
          teacherId,
          date: dateWhere,
        },
        select: { id: true, date: true, startTime: true, endTime: true },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.lesson.findMany({
        where: {
          teacherId,
          date: dateWhere,
          status: { notIn: ["canceled"] },
        },
        select: { date: true, startTime: true },
      }),
    ]);

    const takenSet = new Set(
      takenLessons.map((l) => `${toDateStr(l.date)}_${l.startTime}`)
    );

    const available = slots.filter(
      (s) => !takenSet.has(`${toDateStr(s.date)}_${s.startTime}`)
    );

    return NextResponse.json(
      available.map((s) => ({
        id: s.id,
        date: toDateStr(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    );
  } catch (e) {
    console.error("[teachers/:id/availability] GET error:", e);
    return NextResponse.json(
      { error: "Failed to load availability" },
      { status: 500 }
    );
  }
}
