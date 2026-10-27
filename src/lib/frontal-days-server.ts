import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_CHECKLIST,
  DEFAULT_MESSAGE_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
  type TemplateValues,
  wazeUrl,
} from "@/lib/frontal-days";
import { hebrewDateLabel } from "@/lib/group-lessons-server";

export const FRONTAL_DEFAULTS_KEY = "frontal_defaults";

export type FrontalDefaults = { messageTemplate: string; reminderTemplate: string; checklist: string[] };

export async function getFrontalDefaults(prisma: PrismaClient): Promise<FrontalDefaults> {
  const row = await prisma.appSetting.findUnique({ where: { key: FRONTAL_DEFAULTS_KEY } });
  const v = (row?.value ?? {}) as Partial<FrontalDefaults>;
  return {
    messageTemplate: typeof v.messageTemplate === "string" && v.messageTemplate.trim() ? v.messageTemplate : DEFAULT_MESSAGE_TEMPLATE,
    reminderTemplate: typeof v.reminderTemplate === "string" && v.reminderTemplate.trim() ? v.reminderTemplate : DEFAULT_REMINDER_TEMPLATE,
    checklist: Array.isArray(v.checklist) ? v.checklist.filter((x): x is string => typeof x === "string" && !!x.trim()) : DEFAULT_CHECKLIST,
  };
}

type DayForTemplate = {
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  address: string;
  topic: string;
  presentationUrl: string;
  contactName: string;
  contactPhone: string;
  whatsappUrl: string;
};

export function templateValues(day: DayForTemplate, teacherName: string): TemplateValues {
  return {
    שם_המדריך: teacherName,
    כותרת: day.title,
    תאריך: hebrewDateLabel(day.date),
    שעות: `${day.startTime}–${day.endTime}`,
    כתובת: day.address,
    וויז: wazeUrl(day.address),
    נושא: day.topic,
    מצגת: day.presentationUrl,
    איש_קשר: day.contactName,
    טלפון_איש_קשר: day.contactPhone,
    וואטסאפ: day.whatsappUrl,
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const optionalUrl = (label: string) =>
  z
    .string()
    .trim()
    .max(1000)
    .refine((v) => !v || /^https?:\/\/\S+$/i.test(v), { message: `${label}: קישור צריך להתחיל ב-https://` })
    .optional()
    .default("");
const text = (max: number) => z.string().trim().max(max).optional().default("");

export const FrontalDayInput = z
  .object({
    title: z.string().trim().min(1, "הזינו את שם בית הספר או המקום").max(200),
    date: z.string().regex(DATE, "בחרו תאריך"),
    startTime: z.string().regex(TIME, "שעת התחלה לא תקינה"),
    endTime: z.string().regex(TIME, "שעת סיום לא תקינה"),
    address: z.string().trim().min(1, "הזינו כתובת").max(300),
    topic: text(300),
    presentationUrl: optionalUrl("מצגת"),
    contactName: text(120),
    contactPhone: text(40),
    whatsappUrl: optionalUrl("קבוצת וואטסאפ"),
    feedbackUrl: optionalUrl("טופס משוב"),
    courseCode: text(100),
    courseUrl: optionalUrl("קורס מתנה"),
    recipientName: text(200),
    recipientEmail: z
      .string()
      .trim()
      .max(200)
      .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "כתובת המייל של מקבל הדוח לא תקינה" })
      .optional()
      .default(""),
    teachersNeeded: z.coerce.number().int().min(1, "לפחות מדריך אחד").max(50),
  })
  .refine((v) => v.endTime > v.startTime, { message: "שעת הסיום צריכה להיות אחרי שעת ההתחלה", path: ["endTime"] });

export const TemplatesInput = z.object({
  messageTemplate: z.string().trim().min(1, "ההודעה לא יכולה להיות ריקה").max(6000),
  reminderTemplate: z.string().trim().min(1, "התזכורת לא יכולה להיות ריקה").max(6000),
  checklist: z.array(z.string().trim().min(1).max(300)).max(40),
});
