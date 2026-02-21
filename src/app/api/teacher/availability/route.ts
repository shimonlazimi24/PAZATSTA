import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

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
                gte: new Date(start),
                lte: new Date(end),
              },
            }
          : {}),
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });
    return NextResponse.json(
      slots.map((s) => ({
        id: s.id,
        date: s.date.toISOString().slice(0, 10),
        startTime: s.startTime,
        endTime: s.endTime,
        isAvailable: s.isAvailable,
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

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const date = body.date ? new Date(body.date) : null;
    const startTime = typeof body.startTime === "string" ? body.startTime : "";
    const endTime = typeof body.endTime === "string" ? body.endTime : "";
    if (!date || isNaN(date.getTime()) || !startTime || !endTime) {
      return NextResponse.json(
        { error: "date (YYYY-MM-DD), startTime, endTime required" },
        { status: 400 }
      );
    }
    const slot = await prisma.availability.create({
      data: {
        teacherId: user.id,
        date,
        startTime,
        endTime,
        isAvailable: body.isAvailable !== false,
      },
    });
    return NextResponse.json({
      id: slot.id,
      date: slot.date.toISOString().slice(0, 10),
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.isAvailable,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create availability" },
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
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  await prisma.availability.deleteMany({
    where: { id, teacherId: user.id },
  });
  return NextResponse.json({ ok: true });
}
