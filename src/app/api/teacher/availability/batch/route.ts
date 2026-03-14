import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

function isDbUnreachable(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P1001";
}

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const slots = Array.isArray(body.slots) ? body.slots : [];
    if (slots.length === 0) {
      return NextResponse.json({ error: "slots array required" }, { status: 400 });
    }
    type SlotData = { teacherId: string; date: Date; startTime: string; endTime: string };
    const data = slots
      .map((s: unknown): SlotData | null => {
        const dateStr = typeof (s as { date?: string }).date === "string" ? (s as { date: string }).date.trim() : "";
        const startTime = typeof (s as { startTime?: string }).startTime === "string" ? (s as { startTime: string }).startTime : "";
        const endTime = typeof (s as { endTime?: string }).endTime === "string" ? (s as { endTime: string }).endTime : "";
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !startTime || !endTime) return null;
        const date = new Date(dateStr + "T00:00:00.000Z");
        if (isNaN(date.getTime())) return null;
        return { teacherId: user.id, date, startTime, endTime };
      })
      .filter((d: SlotData | null): d is SlotData => d !== null);

    if (data.length === 0) {
      return NextResponse.json({ error: "No valid slots" }, { status: 400 });
    }

    await prisma.availability.createMany({
      data,
      skipDuplicates: true,
    });
    return NextResponse.json({ ok: true });
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
