import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_LENGTHS = {
  name: 80,
  phone: 30,
  displayName: 80,
  bio: 2000,
  profileImageUrl: 500,
  specialization: 200,
} as const;

function trimAndCap(s: string | null | undefined, max: number): string | undefined {
  if (s === undefined || s === null) return undefined;
  const t = String(s).trim();
  return t === "" ? undefined : t.slice(0, max);
}

export async function GET() {
  const sessionUser = await getUserFromSession();
  if (!sessionUser || sessionUser.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const row = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      phone: true,
      email: true,
      teacherProfile: {
        select: { profileImageUrl: true, displayName: true, bio: true, specialization: true, specialties: true },
      },
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const profile = row.teacherProfile;
  return NextResponse.json({
    name: row.name ?? "",
    phone: row.phone ?? "",
    email: row.email,
    profileImageUrl: profile?.profileImageUrl ?? null,
    displayName: profile?.displayName ?? null,
    bio: profile?.bio ?? null,
    specialization: profile?.specialization ?? null,
    specialties: profile?.specialties ?? [],
  });
}

export async function PATCH(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const name = trimAndCap(body.name, MAX_LENGTHS.name);
    const phone = trimAndCap(body.phone, MAX_LENGTHS.phone);
    const profileImageUrl =
      typeof body.profileImageUrl === "string"
        ? body.profileImageUrl.trim().slice(0, MAX_LENGTHS.profileImageUrl) || null
        : undefined;
    const displayName = trimAndCap(body.displayName, MAX_LENGTHS.displayName);
    const bio = trimAndCap(body.bio, MAX_LENGTHS.bio);
    const specialization = trimAndCap(body.specialization, MAX_LENGTHS.specialization);
    const specialties =
      Array.isArray(body.specialties) && body.specialties.every((x: unknown) => typeof x === "string")
        ? (body.specialties as string[]).map((s) => s.trim()).filter(Boolean)
        : undefined;

    const userData: { name?: string; phone?: string } = {};
    if (name !== undefined) userData.name = name;
    if (phone !== undefined) userData.phone = phone;

    const profileData: { profileImageUrl?: string | null; displayName?: string | null; bio?: string | null; specialization?: string | null; specialties?: string[] } = {};
    if (profileImageUrl !== undefined) profileData.profileImageUrl = profileImageUrl;
    if (displayName !== undefined) profileData.displayName = displayName;
    if (bio !== undefined) profileData.bio = bio;
    if (specialization !== undefined) profileData.specialization = specialization;
    if (specialties !== undefined) profileData.specialties = specialties;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: userData,
        });
      }
      if (Object.keys(profileData).length > 0) {
        await tx.teacherProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, ...profileData },
          update: profileData,
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[teacher/profile] PATCH error:", e);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
