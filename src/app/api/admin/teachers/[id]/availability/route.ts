import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

async function requireAdminTeacher(teacherId: string) {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: "teacher" },
  });
  if (!teacher) {
    return { error: NextResponse.json({ error: "מורה לא נמצא" }, { status: 404 }) };
  }
  return { teacherId };
}

/** GET: Fetch availability slots for a teacher (admin). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teacherId } = await params;
  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacher id" }, { status: 400 });
  }
  const auth = await requireAdminTeacher(teacherId);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json(
      { error: "start and end (YYYY-MM-DD) required" },
      { status: 400 }
    );
  }
  try {
    const slots = await prisma.availability.findMany({
      where: {
        teacherId,
        date: {
          gte: new Date(start + "T00:00:00.000Z"),
          lte: new Date(end + "T23:59:59.999Z"),
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(
      slots.map((s) => ({
        id: s.id,
        date: s.date.toISOString().slice(0, 10),
        startTime: s.startTime,
        endTime: s.endTime,
      }))
    );
  } catch (e) {
    console.error("[admin/teachers/availability] GET error:", e);
    return NextResponse.json(
      { error: "שגיאה בטעינת הזמינות" },
      { status: 500 }
    );
  }
}

/** POST: Add availability slots (batch, admin). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teacherId } = await params;
  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacher id" }, { status: 400 });
  }
  const auth = await requireAdminTeacher(teacherId);
  if (auth.error) return auth.error;

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
        return { teacherId, date, startTime, endTime };
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
    console.error("[admin/teachers/availability] POST error:", e);
    return NextResponse.json(
      { error: "שגיאה בשמירת המשבצות" },
      { status: 500 }
    );
  }
}

/** DELETE: Remove slots by date or by id (admin). */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teacherId } = await params;
  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacher id" }, { status: 400 });
  }
  const auth = await requireAdminTeacher(teacherId);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const dateStr = searchParams.get("date");

  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const date = new Date(dateStr + "T00:00:00.000Z");
    if (!isNaN(date.getTime())) {
      await prisma.availability.deleteMany({
        where: { teacherId, date },
      });
      return NextResponse.json({ ok: true });
    }
  }
  if (id) {
    await prisma.availability.deleteMany({
      where: { id, teacherId },
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id or date required" }, { status: 400 });
}
