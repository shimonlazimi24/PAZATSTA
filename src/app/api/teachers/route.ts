import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const teachers = await prisma.user.findMany({
    where: { role: "teacher" },
    include: { teacherProfile: true },
    orderBy: { email: "asc" },
  });
  return NextResponse.json(
    teachers.map((t) => ({
      id: t.id,
      email: t.email,
      name: t.name,
      phone: t.phone ?? null,
      bio: t.teacherProfile?.bio ?? null,
      profileImageUrl: t.teacherProfile?.profileImageUrl ?? null,
    }))
  );
}
