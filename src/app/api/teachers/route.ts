import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEFAULT_TAKE = 50;
const MAX_TAKE = 200;

/**
 * Public teachers list. Does not expose email/phone for privacy.
 * For admin/teacher-only data use a protected route.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const take = Math.min(
      Math.max(1, parseInt(searchParams.get("take") ?? String(DEFAULT_TAKE), 10) || DEFAULT_TAKE),
      MAX_TAKE
    );
    const skip = Math.max(0, parseInt(searchParams.get("skip") ?? "0", 10) || 0);

    const where = q
      ? {
          role: "teacher" as const,
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
            {
              teacherProfile: {
                displayName: { contains: q, mode: "insensitive" as const },
              },
            },
          ],
        }
      : { role: "teacher" as const };

    const teachers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        teacherProfile: {
          select: { displayName: true, bio: true, profileImageUrl: true, specialization: true },
        },
      },
      orderBy: { email: "asc" },
      take,
      skip,
    });

    return NextResponse.json(
      teachers.map((t) => ({
        id: t.id,
        name: t.teacherProfile?.displayName ?? t.name ?? null,
        bio: t.teacherProfile?.bio ?? null,
        profileImageUrl: t.teacherProfile?.profileImageUrl ?? null,
        specialization: t.teacherProfile?.specialization ?? null,
      }))
    );
  } catch (e) {
    console.error("[teachers] GET error:", e);
    return NextResponse.json(
      { error: "Failed to load teachers" },
      { status: 500 }
    );
  }
}
