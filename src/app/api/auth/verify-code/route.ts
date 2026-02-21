import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyOTP } from "@/lib/otp";
import {
  createSession,
  getSessionCookieConfig,
  SESSION_COOKIE,
  sign,
} from "@/lib/auth";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
    if (!email || code.length !== 6) {
      return NextResponse.json(
        { error: "Email and 6-digit code required" },
        { status: 400 }
      );
    }

    const loginCode = await prisma.loginCode.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
    if (!loginCode) {
      return NextResponse.json(
        { error: "No code requested or expired. Request a new code." },
        { status: 400 }
      );
    }
    if (loginCode.expiresAt < new Date()) {
      await prisma.loginCode.delete({ where: { id: loginCode.id } });
      return NextResponse.json(
        { error: "Code expired. Request a new code." },
        { status: 400 }
      );
    }
    if (loginCode.attempts >= MAX_ATTEMPTS) {
      await prisma.loginCode.delete({ where: { id: loginCode.id } });
      return NextResponse.json(
        { error: "Too many attempts. Request a new code." },
        { status: 400 }
      );
    }

    if (!verifyOTP(code, loginCode.codeHash)) {
      await prisma.loginCode.update({
        where: { id: loginCode.id },
        data: { attempts: loginCode.attempts + 1 },
      });
      const newAttempts = loginCode.attempts + 1;
      if (newAttempts >= MAX_ATTEMPTS) {
        await prisma.loginCode.delete({ where: { id: loginCode.id } });
      }
      return NextResponse.json({ error: "Invalid code" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const invite = await prisma.invite.findFirst({
        where: {
          email,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      // Only teachers (and admin/parent) need an invite. Students can always sign up (no invite = create as student).
      const newRole = invite ? invite.role : "student";
      user = await prisma.user.create({
        data: {
          email,
          role: newRole,
        },
      });
      if (invite) {
        await prisma.invite.update({
          where: { id: invite.id },
          data: { usedAt: new Date() },
        });
      }
      if (user.role === "teacher") {
        await prisma.teacherProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        });
      }
      if (user.role === "student") {
        await prisma.studentProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id },
          update: {},
        });
      }
    }

    await prisma.loginCode.delete({ where: { id: loginCode.id } });
    const sessionId = await createSession(user.id);
    const cookieCfg = getSessionCookieConfig();
    const res = NextResponse.json({
      ok: true,
      role: user.role,
    });
    res.cookies.set(SESSION_COOKIE, sign(sessionId), {
      ...cookieCfg,
      maxAge: cookieCfg.maxAge,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
