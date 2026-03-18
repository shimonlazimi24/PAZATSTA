import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MAX_LENGTHS = {
  name: 80,
  email: 200,
  phone: 30,
  displayName: 80,
  bio: 2000,
  specialization: 200,
} as const;

function trimAndCap(s: string | null | undefined, max: number): string | undefined {
  if (s === undefined || s === null) return undefined;
  const t = String(s).trim();
  return t === "" ? undefined : t.slice(0, max);
}

async function requireAdmin() {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

/**
 * GET: Fetch full teacher profile for admin editing.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id: teacherId } = await params;
  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacher id" }, { status: 400 });
  }
  try {
    const row = await prisma.user.findFirst({
      where: { id: teacherId, role: "teacher" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        teacherProfile: {
          select: {
            displayName: true,
            bio: true,
            specialization: true,
            specialties: true,
            avatarType: true,
            profileImageUrl: true,
          },
        },
      },
    });
    if (!row) {
      return NextResponse.json({ error: "מורה לא נמצא" }, { status: 404 });
    }
    const p = row.teacherProfile;
    return NextResponse.json({
      id: row.id,
      name: row.name ?? "",
      phone: row.phone ?? "",
      email: row.email,
      displayName: p?.displayName ?? null,
      bio: p?.bio ?? null,
      specialization: p?.specialization ?? null,
      specialties: p?.specialties ?? [],
      avatarType: p?.avatarType ?? null,
      profileImageUrl: p?.profileImageUrl ?? null,
    });
  } catch (e) {
    console.error("[admin/teachers] GET error:", e);
    return NextResponse.json({ error: "שגיאה בטעינת הפרטים" }, { status: 500 });
  }
}

/**
 * PATCH: Update teacher profile (admin only).
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const { id: teacherId } = await params;
  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacher id" }, { status: 400 });
  }
  try {
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: "teacher" },
    });
    if (!teacher) {
      return NextResponse.json({ error: "מורה לא נמצא" }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const name = trimAndCap(body.name, MAX_LENGTHS.name);
    const email = trimAndCap(body.email, MAX_LENGTHS.email);
    const phone = trimAndCap(body.phone, MAX_LENGTHS.phone);
    const avatarType =
      body.avatarType === "male" || body.avatarType === "female"
        ? body.avatarType
        : body.avatarType === null || body.avatarType === ""
          ? null
          : undefined;
    const displayName = trimAndCap(body.displayName, MAX_LENGTHS.displayName);
    const bio = trimAndCap(body.bio, MAX_LENGTHS.bio);
    const specialization = trimAndCap(body.specialization, MAX_LENGTHS.specialization);
    const specialties =
      Array.isArray(body.specialties) && body.specialties.every((x: unknown) => typeof x === "string")
        ? (body.specialties as string[]).map((s) => s.trim()).filter(Boolean)
        : undefined;

    const userData: { name?: string; phone?: string; email?: string } = {};
    if (name !== undefined) userData.name = name;
    if (phone !== undefined) userData.phone = phone;
    if (email !== undefined) userData.email = email;

    const profileData: { avatarType?: string | null; profileImageUrl?: string | null; displayName?: string | null; bio?: string | null; specialization?: string | null; specialties?: string[] } = {};
    if (avatarType !== undefined) {
      profileData.avatarType = avatarType;
      if (avatarType) profileData.profileImageUrl = null;
    }
    if (displayName !== undefined) profileData.displayName = displayName;
    if (bio !== undefined) profileData.bio = bio;
    if (specialization !== undefined) profileData.specialization = specialization;
    if (specialties !== undefined) profileData.specialties = specialties;

    await prisma.$transaction(async (tx) => {
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: teacherId },
          data: userData,
        });
      }
      if (Object.keys(profileData).length > 0) {
        await tx.teacherProfile.upsert({
          where: { userId: teacherId },
          create: { userId: teacherId, ...profileData },
          update: profileData,
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const prismaErr = e as { code?: string };
    if (prismaErr?.code === "P2002") {
      return NextResponse.json({ error: "אימייל זה כבר בשימוש" }, { status: 409 });
    }
    console.error("[admin/teachers] PATCH error:", e);
    return NextResponse.json({ error: "שגיאה בשמירה" }, { status: 500 });
  }
}

/**
 * DELETE: Remove a teacher from the system (admin only).
 * Cascades: TeacherProfile, Availability, Lessons (as teacher), Sessions.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: teacherId } = await params;
  if (!teacherId) {
    return NextResponse.json({ error: "Missing teacher id" }, { status: 400 });
  }
  try {
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, role: "teacher" },
    });
    if (!teacher) {
      return NextResponse.json({ error: "מורה לא נמצא" }, { status: 404 });
    }
    await prisma.user.delete({
      where: { id: teacherId },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/teachers] DELETE error:", e);
    return NextResponse.json(
      { error: "שגיאה במחיקת המורה" },
      { status: 500 }
    );
  }
}
