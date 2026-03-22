/**
 * Pure helpers + aggregation logic for admin lesson statistics.
 */

import type {
  AdminStatisticsCancellations,
  AdminStatisticsResponse,
  AdminStatisticsSeriesPoint,
  AdminStatisticsSummary,
  AdminStatisticsTeacherRow,
  AdminStatisticsTimeDistribution,
} from "./admin-statistics-types";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** One decimal place, 0–100 scale. */
export function percentOneDecimal(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

export function isValidISODate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(s + "T00:00:00.000Z");
  return !isNaN(d.getTime());
}

/** Inclusive UTC day bounds for filtering `Lesson.date`. */
export function lessonDateRangeUTC(from: string, to: string): { gte: Date; lte: Date } {
  const gte = new Date(from + "T00:00:00.000Z");
  const lte = new Date(to + "T23:59:59.999Z");
  return { gte, lte };
}

export function parseTimeToMinutes(t: string): number {
  const parts = t.trim().split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (Number.isNaN(h)) return 0;
  return h * 60 + (Number.isNaN(m) ? 0 : m);
}

/** Duration in hours between HH:MM strings (same day; simple overnight). */
export function lessonDurationHours(startTime: string, endTime: string): number {
  const a = parseTimeToMinutes(startTime);
  const b = parseTimeToMinutes(endTime);
  if (b <= a) return (24 * 60 - a + b) / 60;
  return (b - a) / 60;
}

const WEEKDAY_LABELS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function jerusalemWeekdayIndex(d: Date): number {
  const s = d.toLocaleDateString("en-US", {
    timeZone: "Asia/Jerusalem",
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[s] ?? 0;
}

function dateKeyUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function enumerateDaysInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = new Date(from + "T00:00:00.000Z");
  const end = new Date(to + "T00:00:00.000Z");
  while (cur <= end) {
    out.push(dateKeyUTC(cur));
    cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
  }
  return out;
}

export function previousPeriodOfSameLength(
  from: string,
  to: string
): { from: string; to: string } {
  const start = new Date(from + "T00:00:00.000Z");
  const end = new Date(to + "T23:59:59.999Z");
  const ms = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - ms);
  return {
    from: dateKeyUTC(prevStart),
    to: dateKeyUTC(prevEnd),
  };
}

export type LessonStatRow = {
  id: string;
  teacherId: string;
  studentId: string;
  status: string;
  date: Date;
  startTime: string;
  endTime: string;
};

export function buildAdminStatistics(
  lessons: LessonStatRow[],
  range: { from: string; to: string },
  options?: {
    previousLessons?: LessonStatRow[];
    cancellationReasons?: Array<{ lessonId: string; reason: string | null }>;
    cancelledBy?: Array<{ lessonId: string; by: string | null }>;
    teacherNames?: Map<string, string>;
  }
): AdminStatisticsResponse {
  const { from, to } = range;
  const previousRange = previousPeriodOfSameLength(from, to);

  const totalLessons = lessons.length;
  let completed = 0;
  let canceled = 0;
  for (const l of lessons) {
    if (l.status === "completed") completed++;
    if (l.status === "canceled") canceled++;
  }
  const cancellationRate = percentOneDecimal(canceled, totalLessons);

  const studentSet = new Set(lessons.map((l) => l.studentId));
  const teacherSet = new Set(lessons.map((l) => l.teacherId));

  const lessonCountByStudent = new Map<string, number>();
  for (const l of lessons) {
    lessonCountByStudent.set(l.studentId, (lessonCountByStudent.get(l.studentId) ?? 0) + 1);
  }
  let studentsWithSingleLesson = 0;
  let studentsWithMultipleLessons = 0;
  for (const n of Array.from(lessonCountByStudent.values())) {
    if (n === 1) studentsWithSingleLesson++;
    else if (n >= 2) studentsWithMultipleLessons++;
  }
  const activeStudents = studentSet.size;
  const repeatStudentsPercent = percentOneDecimal(studentsWithMultipleLessons, activeStudents);

  const summary: AdminStatisticsSummary = {
    totalLessons,
    completed,
    canceled,
    cancellationRate,
    activeStudents,
    activeTeachers: teacherSet.size,
    studentsWithSingleLesson,
    studentsWithMultipleLessons,
    repeatStudentsPercent,
  };

  const days = enumerateDaysInclusive(from, to);
  const byDayCompleted = new Map<string, number>();
  const byDayCanceled = new Map<string, number>();
  for (const d of days) {
    byDayCompleted.set(d, 0);
    byDayCanceled.set(d, 0);
  }
  for (const l of lessons) {
    const key = dateKeyUTC(l.date);
    if (l.status === "completed") {
      byDayCompleted.set(key, (byDayCompleted.get(key) ?? 0) + 1);
    }
    if (l.status === "canceled") {
      byDayCanceled.set(key, (byDayCanceled.get(key) ?? 0) + 1);
    }
  }
  const series: AdminStatisticsSeriesPoint[] = days.map((d) => ({
    date: d,
    completed: byDayCompleted.get(d) ?? 0,
    canceled: byDayCanceled.get(d) ?? 0,
  }));

  const hasReasonField = Boolean(options?.cancellationReasons?.length);
  const hasByField = Boolean(options?.cancelledBy?.length);
  const hasTracking = hasReasonField || hasByField;

  const reasonCounts = new Map<string, number>();
  if (options?.cancellationReasons) {
    for (const row of options.cancellationReasons) {
      const r = (row.reason ?? "").trim() || "(ללא סיבה)";
      reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1);
    }
  }
  const byReason = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  const byCancelledBy = {
    student: 0,
    teacher: 0,
    admin: 0,
    system: 0,
  };
  if (options?.cancelledBy) {
    for (const row of options.cancelledBy) {
      const k = (row.by ?? "").toLowerCase();
      if (k === "student") byCancelledBy.student++;
      else if (k === "teacher") byCancelledBy.teacher++;
      else if (k === "admin") byCancelledBy.admin++;
      else if (k === "system") byCancelledBy.system++;
    }
  }

  const cancellations: AdminStatisticsCancellations = {
    total: canceled,
    ratePercent: cancellationRate,
    byReason,
    byCancelledBy,
    hasTracking,
  };

  const byTeacher = new Map<
    string,
    { total: number; completed: number; canceled: number; hours: number }
  >();
  for (const l of lessons) {
    const cur = byTeacher.get(l.teacherId) ?? {
      total: 0,
      completed: 0,
      canceled: 0,
      hours: 0,
    };
    cur.total++;
    if (l.status === "completed") {
      cur.completed++;
      cur.hours += lessonDurationHours(l.startTime, l.endTime);
    }
    if (l.status === "canceled") cur.canceled++;
    byTeacher.set(l.teacherId, cur);
  }

  const names = options?.teacherNames ?? new Map<string, string>();
  const teachers: AdminStatisticsTeacherRow[] = Array.from(byTeacher.entries()).map(([teacherId, agg]) => {
    const rate = percentOneDecimal(agg.canceled, agg.total);
    return {
      teacherId,
      name: names.get(teacherId) ?? teacherId,
      totalLessons: agg.total,
      completed: agg.completed,
      canceled: agg.canceled,
      cancellationRate: rate,
      teachingHours: Math.round(agg.hours * 10) / 10,
      utilizationRate: null,
    };
  });
  teachers.sort((a, b) => b.completed - a.completed);

  const hourCounts = new Map<number, number>();
  for (let h = 0; h < 24; h++) hourCounts.set(h, 0);
  const weekdayCounts = new Map<number, number>();
  for (let w = 0; w < 7; w++) weekdayCounts.set(w, 0);

  for (const l of lessons) {
    const hour = Math.min(23, Math.max(0, Math.floor(parseTimeToMinutes(l.startTime) / 60)));
    hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    const wd = jerusalemWeekdayIndex(l.date);
    weekdayCounts.set(wd, (weekdayCounts.get(wd) ?? 0) + 1);
  }

  const byHourSorted = Array.from(hourCounts.entries())
    .map(([hour, count]) => ({
      hour,
      count,
      label: `${String(hour).padStart(2, "0")}:00`,
    }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const timeDistribution: AdminStatisticsTimeDistribution = {
    byHour: byHourSorted.length
      ? byHourSorted
      : [9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((hour) => ({
          hour,
          count: 0,
          label: `${String(hour).padStart(2, "0")}:00`,
        })),
    byWeekday: Array.from(weekdayCounts.entries())
      .map(([weekdayIndex, count]) => ({
        weekdayIndex,
        weekdayLabel: WEEKDAY_LABELS_HE[weekdayIndex] ?? String(weekdayIndex),
        count,
      }))
      .sort((a, b) => a.weekdayIndex - b.weekdayIndex),
  };

  const insights: string[] = [];

  const topWd = Array.from(weekdayCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topWd && topWd[1] > 0) {
    insights.push(
      `הכי הרבה שיעורים בטווח: יום ${WEEKDAY_LABELS_HE[topWd[0]]} (${topWd[1]} שיעורים).`
    );
  }

  const topTeacher = teachers[0];
  if (topTeacher && topTeacher.completed > 0) {
    insights.push(
      `הכי הרבה שיעורים שהושלמו: ${topTeacher.name} (${topTeacher.completed} שיעורים).`
    );
  }

  if (studentsWithMultipleLessons > 0) {
    insights.push(
      `${studentsWithMultipleLessons} תלמידים השתתפו ביותר משיעור אחד בטווח (חוזרים בטווח).`
    );
  }

  if (options?.previousLessons) {
    const prevTotal = options.previousLessons.length;
    let prevCanceled = 0;
    for (const l of options.previousLessons) {
      if (l.status === "canceled") prevCanceled++;
    }
    const prevRate = percentOneDecimal(prevCanceled, prevTotal);
    if (prevTotal > 0 && totalLessons > 0) {
      if (cancellationRate > prevRate + 0.5) {
        insights.push(
          `שיעור הביטולים עלה לעומת התקופה הקודמת (${prevRate}% → ${cancellationRate}%).`
        );
      } else if (cancellationRate + 0.5 < prevRate) {
        insights.push(
          `שיעור הביטולים ירד לעומת התקופה הקודמת (${prevRate}% → ${cancellationRate}%).`
        );
      }
    }
  }

  return {
    range: { from, to },
    previousRange,
    summary,
    series,
    cancellations,
    teachers,
    timeDistribution,
    insights,
  };
}
