import { z } from "zod";
import { typeLabel } from "@/lib/group-lessons";

/** GroupLesson.date is UTC midnight of the Israeli date, so the ISO date is the calendar date. */
export function lessonDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function lessonDateFromStr(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** "יום ה׳, 10 בדצמבר" */
export function hebrewDateLabel(date: Date): string {
  return date.toLocaleDateString("he-IL", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}

export function emailInfo(lesson: {
  date: Date;
  startTime: string;
  endTime: string;
  location: string | null;
  details: string | null;
  type: { category: string; name: string };
}) {
  return {
    typeLabel: typeLabel(lesson.type),
    dateLabel: hebrewDateLabel(lesson.date),
    timeRange: `${lesson.startTime}–${lesson.endTime}`,
    location: lesson.location,
    details: lesson.details,
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export const GroupLessonInput = z
  .object({
    typeId: z.string().min(1, "בחרו סוג שיעור"),
    date: z.string().regex(DATE, "בחרו תאריך"),
    startTime: z.string().regex(TIME, "שעת התחלה לא תקינה"),
    endTime: z.string().regex(TIME, "שעת סיום לא תקינה"),
    location: z.string().trim().max(300).optional().default(""),
    details: z.string().trim().max(4000).optional().default(""),
    teachersNeeded: z.coerce.number().int().min(1, "לפחות מורה אחד").max(50),
  })
  .refine((v) => v.endTime > v.startTime, { message: "שעת הסיום צריכה להיות אחרי שעת ההתחלה", path: ["endTime"] });

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "נתונים לא תקינים";
}
