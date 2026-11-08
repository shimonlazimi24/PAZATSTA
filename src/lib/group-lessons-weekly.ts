import type { PrismaClient } from "@prisma/client";
import { addDaysYYYYMMDD, todayIsraelYYYYMMDD } from "@/lib/dates";
import { monthKeyOf, nextMonthKey } from "@/lib/group-lessons";
import { lessonDateFromStr } from "@/lib/group-lessons-server";

/**
 * Fixed weekly group lessons (e.g. every Sunday and Tuesday). The admin sets the
 * weekly slots once; lessons are created from them automatically through the end
 * of next month, so teachers always see the dates and sign up. Each new lesson
 * starts with a "topic coming soon" placeholder until the admin picks the topic.
 * A lesson the admin edits or cancels (a holiday, say) is never recreated.
 */

/** Hidden placeholder topic, created by migration 20261108120000_group_lesson_weekly. */
export const PENDING_TOPIC_TYPE_ID = "glt_topic_pending";

export const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"] as const;

export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** Last day of next month: lessons are created that far ahead. */
export function horizonEnd(todayStr: string): string {
  const after = nextMonthKey(nextMonthKey(monthKeyOf(todayStr)));
  return addDaysYYYYMMDD(`${after}-01`, -1);
}

/** Every date from `fromStr` to `toStr` (inclusive) that falls on `weekday`. */
export function datesOnWeekday(fromStr: string, toStr: string, weekday: number): string[] {
  const out: string[] = [];
  let d = fromStr;
  const shift = (weekday - weekdayOf(d) + 7) % 7;
  d = addDaysYYYYMMDD(d, shift);
  while (d <= toStr) {
    out.push(d);
    d = addDaysYYYYMMDD(d, 7);
  }
  return out;
}

/** Creates the missing lessons for every active weekly slot. Safe to run any number of times. */
export async function generateWeeklyLessons(prisma: PrismaClient, todayStr = todayIsraelYYYYMMDD()): Promise<number> {
  const schedules = await prisma.groupLessonSchedule.findMany({ where: { active: true } });
  if (schedules.length === 0) return 0;
  const end = horizonEnd(todayStr);
  const data = schedules.flatMap((s) =>
    datesOnWeekday(todayStr, end, s.weekday).map((date) => ({
      typeId: PENDING_TOPIC_TYPE_ID,
      scheduleId: s.id,
      date: lessonDateFromStr(date),
      startTime: s.startTime,
      endTime: s.endTime,
      location: s.location,
      teachersNeeded: s.teachersNeeded,
    }))
  );
  // The unique (scheduleId, date) key skips lessons that already exist, including canceled ones.
  const { count } = await prisma.groupLesson.createMany({ data, skipDuplicates: true });
  return count;
}
