import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const sessionUser = await getUserFromSession();
  if (!sessionUser || sessionUser.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { name: true, phone: true, email: true },
  });
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: sessionUser.id },
  });
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    name: user.name ?? "",
    phone: user.phone ?? "",
    email: user.email,
    profileImageUrl: profile?.profileImageUrl ?? null,
    displayName: profile?.displayName ?? null,
    bio: profile?.bio ?? null,
  });
}

export async function PATCH(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : undefined;
    const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
    const profileImageUrl =
      typeof body.profileImageUrl === "string" ? body.profileImageUrl.trim() || null : undefined;
    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : undefined;
    const bio = typeof body.bio === "string" ? body.bio.trim() : undefined;

    if (name !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { name },
      });
    }
    if (phone !== undefined) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phone },
      });
    }

    const profileData: Record<string, unknown> = {};
    if (profileImageUrl !== undefined) profileData.profileImageUrl = profileImageUrl;
    if (displayName !== undefined) profileData.displayName = displayName;
    if (bio !== undefined) profileData.bio = bio;

    if (Object.keys(profileData).length > 0) {
      await prisma.teacherProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...profileData },
        update: profileData,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[teacher/profile] PATCH error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
