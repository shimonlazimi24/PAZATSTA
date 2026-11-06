import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { isValidEmail } from "@/lib/validation";
import { isPhoneOnlyEmail } from "@/lib/phone-only";
import { phoneLoginEnabled } from "@/lib/sms";

export const dynamic = "force-dynamic";

const MAX_NAME = 200;
const MAX_PHONE = 30;
const MAX_TOPIC = 200;

/**
 * Every field is optional (PATCH), but a field that is present must be valid.
 * Previously an unparseable currentScreeningDate produced an Invalid Date that
 * Prisma rejected as a 500, and parentEmail was stored without any format check.
 */
const ProfileSchema = z.object({
  studentFullName: z.string().trim().max(MAX_NAME).optional(),
  parentFullName: z.string().trim().max(MAX_NAME).optional(),
  parentPhone: z.string().trim().max(MAX_PHONE).optional(),
  parentEmail: z
    .union([z.literal(""), z.null(), z.string().trim().max(MAX_NAME)])
    .optional(),
  currentScreeningType: z.string().trim().max(MAX_TOPIC).optional(),
  currentScreeningDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "currentScreeningDate must be YYYY-MM-DD")
    .optional(),
});

export async function GET() {
  const user = await getUserFromSession();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [profile, account] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId: user.id } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { email: true, phone: true } }),
  ]);
  // The ways this student logs in; a phone-only account has no real email.
  const login = {
    loginEmail: account && !isPhoneOnlyEmail(account.email) ? account.email : null,
    loginPhone: account?.phone ?? null,
    smsAvailable: phoneLoginEnabled(),
  };
  if (!profile) {
    return NextResponse.json({
      ...login,
      studentFullName: null,
      parentFullName: null,
      parentPhone: null,
      parentEmail: null,
      currentScreeningType: null,
      currentScreeningDate: null,
    });
  }
  return NextResponse.json({
    ...login,
    studentFullName: profile.studentFullName,
    parentFullName: profile.parentFullName,
    parentPhone: profile.parentPhone,
    parentEmail: profile.parentEmail,
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
    const parsed = ProfileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "נתוני הפרופיל לא תקינים" }, { status: 400 });
    }
    const {
      studentFullName,
      parentFullName,
      parentPhone,
      currentScreeningType,
    } = parsed.data;

    const rawParentEmail = parsed.data.parentEmail;
    let parentEmail: string | null | undefined;
    if (rawParentEmail === undefined) {
      parentEmail = undefined;
    } else if (!rawParentEmail) {
      parentEmail = null;
    } else if (isValidEmail(rawParentEmail)) {
      parentEmail = rawParentEmail;
    } else {
      return NextResponse.json({ error: "כתובת אימייל של ההורה לא תקינה" }, { status: 400 });
    }

    const currentScreeningDate = parsed.data.currentScreeningDate
      ? new Date(`${parsed.data.currentScreeningDate}T12:00:00.000Z`)
      : undefined;

    const data: Record<string, unknown> = {};
    if (studentFullName !== undefined) data.studentFullName = studentFullName;
    if (parentFullName !== undefined) data.parentFullName = parentFullName;
    if (parentPhone !== undefined) data.parentPhone = parentPhone;
    if (parentEmail !== undefined) data.parentEmail = parentEmail;
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
