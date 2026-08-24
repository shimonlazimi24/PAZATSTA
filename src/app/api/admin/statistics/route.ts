import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import {
  buildAdminStatistics,
  isValidISODate,
  lessonDateRangeUTC,
  previousPeriodOfSameLength,
  type LessonStatRow,
} from "@/lib/admin-statistics";

export const dynamic = "force-dynamic";

/**
 * Longest range the dashboard will aggregate in one request.
 *
 * Generous on purpose: the row ceiling below is the real protection, and it
 * degrades by reporting truncation rather than by refusing the request. A tight
 * day limit would only turn a working custom range into an error.
 */
const MAX_RANGE_DAYS = 1100;
/** Row ceiling per period; beyond this the aggregation belongs in SQL. */
const MAX_LESSON_ROWS = 20_000;

const LESSON_SELECT = {
  id: true,
  teacherId: true,
  studentId: true,
  status: true,
  date: true,
  startTime: true,
  endTime: true,
} as const;

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function toStatRows(
  rows: Array<{
    id: string;
    teacherId: string;
    studentId: string;
    status: string;
    date: Date;
    startTime: string;
    endTime: string;
  }>
): LessonStatRow[] {
  return rows.map((l) => ({ ...l, status: l.status as string }));
}

function collectTeacherIds(lessons: LessonStatRow[]): string[] {
  const ids = new Set<string>();
  for (const l of lessons) ids.add(l.teacherId);
  return Array.from(ids);
}

export async function GET(req: Request) {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  let from = searchParams.get("from")?.trim() ?? "";
  let to = searchParams.get("to")?.trim() ?? "";

  if (!from || !to) {
    const d = defaultRange();
    from = d.from;
    to = d.to;
  }

  if (!isValidISODate(from) || !isValidISODate(to)) {
    return NextResponse.json(
      { error: "Invalid from/to (expected YYYY-MM-DD)" },
      { status: 400 }
    );
  }

  if (from > to) {
    return NextResponse.json(
      { error: "from must be before or equal to to" },
      { status: 400 }
    );
  }

  const spanDays =
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (spanDays > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `טווח מקסימלי ${MAX_RANGE_DAYS} ימים` },
      { status: 400 }
    );
  }

  const range = { from, to };
  const { gte, lte } = lessonDateRangeUTC(from, to);
  const prev = previousPeriodOfSameLength(from, to);
  const prevBounds = lessonDateRangeUTC(prev.from, prev.to);

  // Aggregation happens in buildAdminStatistics, so rows are pulled into memory.
  // Cap it: an unbounded findMany would degrade into a multi-megabyte response
  // rather than an error the caller can act on.
  const [lessons, previousLessons] = await Promise.all([
    prisma.lesson.findMany({
      where: { date: { gte, lte } },
      select: LESSON_SELECT,
      take: MAX_LESSON_ROWS + 1,
    }),
    prisma.lesson.findMany({
      where: { date: { gte: prevBounds.gte, lte: prevBounds.lte } },
      select: LESSON_SELECT,
      take: MAX_LESSON_ROWS + 1,
    }),
  ]);

  const truncated =
    lessons.length > MAX_LESSON_ROWS || previousLessons.length > MAX_LESSON_ROWS;
  if (truncated) {
    console.warn(
      `[admin/statistics] Range ${from}..${to} exceeds ${MAX_LESSON_ROWS} rows; ` +
        "results are truncated. Move this aggregation into SQL."
    );
    lessons.length = Math.min(lessons.length, MAX_LESSON_ROWS);
    previousLessons.length = Math.min(previousLessons.length, MAX_LESSON_ROWS);
  }

  const rows = toStatRows(lessons);
  const prevRows = toStatRows(previousLessons);

  const teacherIds = new Set([...collectTeacherIds(rows), ...collectTeacherIds(prevRows)]);
  const teachersMeta =
    teacherIds.size === 0
      ? []
      : await prisma.user.findMany({
          where: { id: { in: Array.from(teacherIds) } },
          select: {
            id: true,
            name: true,
            email: true,
            teacherProfile: { select: { displayName: true } },
          },
        });

  const teacherNames = new Map<string, string>();
  for (const t of teachersMeta) {
    const label =
      t.teacherProfile?.displayName?.trim() ||
      t.name?.trim() ||
      t.email ||
      t.id;
    teacherNames.set(t.id, label);
  }

  const payload = buildAdminStatistics(rows, range, {
    previousLessons: prevRows,
    teacherNames,
  });

  const res = NextResponse.json({ ...payload, truncated });
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}
