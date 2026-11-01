import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { lessonDateStr } from "@/lib/group-lessons-server";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * GET ?start=YYYY-MM-DD&end=YYYY-MM-DD: the group lessons and frontal days of a
 * week, for the admin's weekly board. Canceled ones are left out.
 */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { searchParams } = new URL(req.url);
  const startStr = searchParams.get("start") ?? "";
  const endStr = searchParams.get("end") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
    return NextResponse.json({ error: "start and end (YYYY-MM-DD) required" }, { status: 400 });
  }
  const start = new Date(`${startStr}T00:00:00.000Z`);
  const end = new Date(`${endStr}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start || end.getTime() - start.getTime() > 45 * DAY_MS) {
    return NextResponse.json({ error: "Range must be 0–45 days" }, { status: 400 });
  }
  const range = { gte: start, lte: end };

  const [groupLessons, frontalDays] = await Promise.all([
    prisma.groupLesson.findMany({
      where: { status: "open", date: range },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        location: true,
        teachersNeeded: true,
        type: { select: { category: true, name: true } },
        signups: { select: { teacherId: true } },
      },
    }),
    prisma.frontalDay.findMany({
      where: { status: "open", date: range },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        title: true,
        date: true,
        startTime: true,
        endTime: true,
        address: true,
        topic: true,
        teachersNeeded: true,
        signups: { select: { teacherId: true } },
      },
    }),
  ]);

  const teacherIds = Array.from(new Set([...groupLessons, ...frontalDays].flatMap((e) => e.signups.map((s) => s.teacherId))));
  const users = teacherIds.length
    ? await prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true, email: true } })
    : [];
  const teacherOf = new Map(users.map((u) => [u.id, { id: u.id, name: u.name || u.email }]));
  const teachers = (signups: { teacherId: string }[]) =>
    signups.map((s) => teacherOf.get(s.teacherId) ?? { id: s.teacherId, name: "—" });

  return NextResponse.json(
    {
      groupLessons: groupLessons.map((g) => ({
        id: g.id,
        date: lessonDateStr(g.date),
        startTime: g.startTime,
        endTime: g.endTime,
        title: `${g.type.category} – ${g.type.name}`,
        place: g.location ?? "",
        teachersNeeded: g.teachersNeeded,
        teachers: teachers(g.signups),
      })),
      frontalDays: frontalDays.map((d) => ({
        id: d.id,
        date: lessonDateStr(d.date),
        startTime: d.startTime,
        endTime: d.endTime,
        title: d.title,
        place: d.address,
        topic: d.topic,
        teachersNeeded: d.teachersNeeded,
        teachers: teachers(d.signups),
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
