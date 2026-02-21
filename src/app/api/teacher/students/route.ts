import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export async function GET() {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const students = await prisma.user.findMany({
    where: { role: "student" },
    select: { id: true, email: true, name: true },
    orderBy: { email: "asc" },
  });
  return NextResponse.json(students);
}
