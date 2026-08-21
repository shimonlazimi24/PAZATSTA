import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import {
  availabilityDateFromYYYYMMDD,
  formatIsraelYYYYMMDD,
  utcDayBounds,
} from "@/lib/dates";

function isDbUnreachable(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P1001";
}

export async function GET(req: Request) {
  try {
    const user = await getUserFromSession();
    if (!user || user.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const slots = await prisma.availability.findMany({
      where: {
        teacherId: user.id,
        ...(start && end
          ? {
              date: {
                gte: utcDayBounds(start).gte,
                lte: utcDayBounds(end).lte,
              },
            }
          : {}),
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(
      slots.map((s) => ({
        id: s.id,
        date: formatIsraelYYYYMMDD(s.date),
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    );
  } catch (e) {
    if (isDbUnreachable(e)) {
      console.error("[teacher/availability] Database unreachable (P1001):", e);
      return NextResponse.json(
        { error: "אין חיבור למסד הנתונים. נא לבדוק את החיבור ולנסות שוב." },
        { status: 503 }
      );
    }
    throw e;
  }
}

/** Times are free text on the wire; constrain them the same way the batch route does. */
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const SlotSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
    startTime: z.string().regex(TIME, "startTime must be HH:MM"),
    endTime: z.string().regex(TIME, "endTime must be HH:MM"),
  })
  .refine((v) => v.endTime > v.startTime, { message: "endTime must be after startTime" });

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const parsed = SlotSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "משבצת לא תקינה (תאריך YYYY-MM-DD, שעות HH:MM, סיום אחרי התחלה)" },
        { status: 400 }
      );
    }
    const { date: dateStr, startTime, endTime } = parsed.data;
    const date = availabilityDateFromYYYYMMDD(dateStr);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }
    const existing = await prisma.availability.findFirst({
      where: { teacherId: user.id, date, startTime },
    });
    if (existing) {
      return NextResponse.json({
        id: existing.id,
        date: formatIsraelYYYYMMDD(existing.date),
        startTime: existing.startTime,
        endTime: existing.endTime,
      });
    }
    const slot = await prisma.availability.create({
      data: {
        teacherId: user.id,
        date,
        startTime,
        endTime,
      },
    });
    return NextResponse.json({
      id: slot.id,
      date: formatIsraelYYYYMMDD(slot.date),
      startTime: slot.startTime,
      endTime: slot.endTime,
    });
  } catch (e) {
    const prismaErr = e as { code?: string };
    if (prismaErr?.code === "P2002") {
      return NextResponse.json(
        { error: "משבצת זו כבר קיימת. ייתכן שנוספה קודם." },
        { status: 409 }
      );
    }
    console.error("[teacher/availability] POST error:", e);
    return NextResponse.json(
      { error: "שגיאה בשמירת המשבצת. נסו שוב." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const dateStr = searchParams.get("date");
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const day = utcDayBounds(dateStr);
    await prisma.availability.deleteMany({
      where: { teacherId: user.id, date: { gte: day.gte, lte: day.lte } },
    });
    return NextResponse.json({ ok: true });
  }
  if (!id) {
    return NextResponse.json({ error: "id or date required" }, { status: 400 });
  }
  await prisma.availability.deleteMany({
    where: { id, teacherId: user.id },
  });
  return NextResponse.json({ ok: true });
}
