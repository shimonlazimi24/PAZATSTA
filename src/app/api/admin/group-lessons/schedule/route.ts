import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, missingTableResponse } from "@/lib/admin-api";
import { todayIsraelYYYYMMDD } from "@/lib/dates";
import { firstZodMessage, lessonDateFromStr } from "@/lib/group-lessons-server";
import { PENDING_TOPIC_TYPE_ID, generateWeeklyLessons } from "@/lib/group-lessons-weekly";

export const dynamic = "force-dynamic";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const Slot = z
  .object({
    id: z.string().optional(),
    weekday: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(TIME, "שעת התחלה לא תקינה"),
    endTime: z.string().regex(TIME, "שעת סיום לא תקינה"),
    location: z.string().trim().max(300).optional().default(""),
    teachersNeeded: z.coerce.number().int().min(1, "לפחות מורה אחד").max(50),
    active: z.boolean().optional().default(true),
  })
  .refine((v) => v.endTime > v.startTime, { message: "שעת הסיום צריכה להיות אחרי שעת ההתחלה" });
const Body = z.object({ slots: z.array(Slot).max(14) });

/** The fixed weekly slots. */
export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  try {
    const slots = await prisma.groupLessonSchedule.findMany({ orderBy: [{ weekday: "asc" }, { startTime: "asc" }] });
    return NextResponse.json(slots, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    throw e;
  }
}

/**
 * Saves the whole list of weekly slots, then creates the lessons ahead. A slot
 * that is removed or turned off drops its future lessons that nobody signed up
 * for and that still have no topic; anything else the admin touched stays.
 */
export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  const slots = parsed.data.slots;
  const today = lessonDateFromStr(todayIsraelYYYYMMDD());

  const existing = await prisma.groupLessonSchedule.findMany({ select: { id: true } });
  const keep = new Set(slots.map((s) => s.id).filter(Boolean) as string[]);
  const removed = existing.map((e) => e.id).filter((id) => !keep.has(id));
  const turnedOff = slots.filter((s) => s.id && !s.active).map((s) => s.id!);

  await prisma.$transaction(async (tx) => {
    const stale = [...removed, ...turnedOff];
    if (stale.length) {
      await tx.groupLesson.deleteMany({
        where: { scheduleId: { in: stale }, date: { gte: today }, typeId: PENDING_TOPIC_TYPE_ID, signups: { none: {} } },
      });
    }
    if (removed.length) await tx.groupLessonSchedule.deleteMany({ where: { id: { in: removed } } });
    for (const s of slots) {
      const data = {
        weekday: s.weekday,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location || null,
        teachersNeeded: s.teachersNeeded,
        active: s.active,
      };
      if (s.id && existing.some((e) => e.id === s.id)) {
        await tx.groupLessonSchedule.update({ where: { id: s.id }, data });
        // New hours or place apply to the slot's upcoming lessons too.
        await tx.groupLesson.updateMany({
          where: { scheduleId: s.id, date: { gte: today }, status: "open" },
          data: { startTime: s.startTime, endTime: s.endTime, location: s.location || null },
        });
      } else await tx.groupLessonSchedule.create({ data });
    }
  });

  const created = await generateWeeklyLessons(prisma);
  return NextResponse.json({ ok: true, created });
}
