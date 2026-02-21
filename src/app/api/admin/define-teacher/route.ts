import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || !canAccessAdmin(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json(
        { error: "נא להזין אימייל" },
        { status: 400 }
      );
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: "teacher" },
      });
      await prisma.teacherProfile.upsert({
        where: { userId: existing.id },
        create: { userId: existing.id },
        update: {},
      });
    } else {
      const newUser = await prisma.user.create({
        data: { email, role: "teacher" },
      });
      await prisma.teacherProfile.create({
        data: { userId: newUser.id },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "שגיאה בשמירה" },
      { status: 500 }
    );
  }
}
