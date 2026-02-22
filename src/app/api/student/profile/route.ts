import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getUserFromSession();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) {
    return NextResponse.json({
      studentFullName: null,
      parentFullName: null,
      parentPhone: null,
      currentScreeningType: null,
      currentScreeningDate: null,
    });
  }
  return NextResponse.json({
    studentFullName: profile.studentFullName,
    parentFullName: profile.parentFullName,
    parentPhone: profile.parentPhone,
    currentScreeningType: profile.currentScreeningType,
    currentScreeningDate: profile.currentScreeningDate?.toISOString().slice(0, 10) ?? null,
  });
}

export async function PATCH(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const studentFullName = typeof body.studentFullName === "string" ? body.studentFullName.trim() : undefined;
    const parentFullName = typeof body.parentFullName === "string" ? body.parentFullName.trim() : undefined;
    const parentPhone = typeof body.parentPhone === "string" ? body.parentPhone.trim() : undefined;
    const currentScreeningType = typeof body.currentScreeningType === "string" ? body.currentScreeningType.trim() : undefined;
    const currentScreeningDate = typeof body.currentScreeningDate === "string" && body.currentScreeningDate
      ? new Date(body.currentScreeningDate)
      : undefined;

    const data: Record<string, unknown> = {};
    if (studentFullName !== undefined) data.studentFullName = studentFullName;
    if (parentFullName !== undefined) data.parentFullName = parentFullName;
    if (parentPhone !== undefined) data.parentPhone = parentPhone;
    if (currentScreeningType !== undefined) data.currentScreeningType = currentScreeningType;
    if (currentScreeningDate !== undefined) data.currentScreeningDate = currentScreeningDate;

    await prisma.studentProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[student/profile] PATCH error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
