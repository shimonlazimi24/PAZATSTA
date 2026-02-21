import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teacherId } = await params;
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const teacher = await prisma.user.findFirst({
    where: { id: teacherId, role: "teacher" },
  });
  if (!teacher) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }
  const slots = await prisma.availability.findMany({
    where: {
      teacherId,
      isAvailable: true,
      date: { gte: new Date() },
      ...(start && end
        ? { date: { gte: new Date(start), lte: new Date(end) } }
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
    }))
  );
}
