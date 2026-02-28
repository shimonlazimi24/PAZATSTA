import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * GET: List all teachers (admin only). Returns id, email, name, phone.
 */
export async function GET() {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const teachers = await prisma.user.findMany({
      where: { role: "teacher" },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        teacherProfile: { select: { displayName: true } },
      },
      orderBy: { email: "asc" },
    });

    return NextResponse.json(
      teachers.map((t) => ({
        id: t.id,
        email: t.email,
        name: t.teacherProfile?.displayName ?? t.name ?? null,
        phone: t.phone ?? null,
      }))
    );
  } catch (e) {
    console.error("[admin/teachers] GET error:", e);
    return NextResponse.json(
      { error: "Failed to load teachers" },
      { status: 500 }
    );
  }
}
