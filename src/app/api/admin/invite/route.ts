import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { ROLES } from "@/types";

const INVITE_EXPIRY_DAYS = 7;

export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const role = ROLES.includes(body.role) ? body.role : null;
    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role (admin|teacher|parent|student) required" },
        { status: 400 }
      );
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
    await prisma.invite.create({
      data: { email, role, expiresAt },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
