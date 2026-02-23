import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

export async function GET(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const take = Math.min(
      Math.max(1, parseInt(searchParams.get("take") ?? String(DEFAULT_TAKE), 10) || DEFAULT_TAKE),
      MAX_TAKE
    );
    const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10) || 0);

    const where = {
      role: "student" as const,
      lessonsAsStudent: { some: { teacherId: user.id } },
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" as const } },
              { name: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const students = await prisma.user.findMany({
      where,
      select: { id: true, email: true, name: true },
      orderBy: { email: "asc" },
      take,
      skip,
    });
    return NextResponse.json(students);
  } catch (e) {
    console.error("[teacher/students] GET error:", e);
    return NextResponse.json({ error: "Failed to load students" }, { status: 500 });
  }
}
