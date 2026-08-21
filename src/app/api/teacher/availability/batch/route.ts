import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

/** One request may not create an unbounded number of rows. */
const MAX_SLOTS_PER_REQUEST = 500;
/** Reject dates absurdly far out; slots are published a season ahead at most. */
const MAX_DAYS_AHEAD = 400;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const SlotSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    startTime: z.string().regex(TIME, "startTime must be HH:MM"),
    endTime: z.string().regex(TIME, "endTime must be HH:MM"),
  })
  .refine((s) => s.endTime > s.startTime, {
    message: "endTime must be after startTime",
  });

const BatchSchema = z.object({
  slots: z.array(SlotSchema).min(1).max(MAX_SLOTS_PER_REQUEST),
});

function isDbUnreachable(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P1001";
}

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => null);
    const parsed = BatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: `נתוני המשבצות לא תקינים (עד ${MAX_SLOTS_PER_REQUEST} משבצות, שעות בפורמט HH:MM)`,
        },
        { status: 400 }
      );
    }

    const maxDate = new Date(Date.now() + MAX_DAYS_AHEAD * 24 * 60 * 60 * 1000);
    const data = [];
    for (const s of parsed.data.slots) {
      const date = new Date(`${s.date}T00:00:00.000Z`);
      if (isNaN(date.getTime()) || date > maxDate) continue;
      data.push({
        teacherId: user.id,
        date,
        startTime: s.startTime,
        endTime: s.endTime,
      });
    }

    if (data.length === 0) {
      return NextResponse.json({ error: "אין משבצות תקינות לשמירה" }, { status: 400 });
    }

    const result = await prisma.availability.createMany({ data, skipDuplicates: true });
    return NextResponse.json({ ok: true, created: result.count });
  } catch (e) {
    if (isDbUnreachable(e)) {
      console.error("[teacher/availability/batch] Database unreachable (P1001):", e);
      return NextResponse.json(
        { error: "אין חיבור למסד הנתונים. נא לבדוק את החיבור ולנסות שוב." },
        { status: 503 }
      );
    }
    console.error("[teacher/availability/batch] POST error:", e);
    return NextResponse.json(
      { error: "שגיאה בשמירת המשבצות. נסו שוב." },
      { status: 500 }
    );
  }
}
