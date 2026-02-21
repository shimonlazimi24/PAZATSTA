import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSession,
  getSessionCookieConfig,
  SESSION_COOKIE,
  sign,
} from "@/lib/auth";

const TEST_TEACHER_EMAIL = "teacher@test.com";
const TEST_STUDENT_EMAIL = "student@test.com";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Test login disabled in production" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const role = body.role === "teacher" ? "teacher" : body.role === "student" ? "student" : null;
    if (!role) {
      return NextResponse.json(
        { error: "Body must include role: 'teacher' or 'student'" },
        { status: 400 }
      );
    }

    const email = role === "teacher" ? TEST_TEACHER_EMAIL : TEST_STUDENT_EMAIL;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Test user not found. Run: npx prisma db seed" },
        { status: 404 }
      );
    }

    const sessionId = await createSession(user.id);
    const cookieCfg = getSessionCookieConfig();
    const res = NextResponse.json({ ok: true, role: user.role });
    res.cookies.set(SESSION_COOKIE, sign(sessionId), {
      ...cookieCfg,
      maxAge: cookieCfg.maxAge,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: "Test login failed" },
      { status: 500 }
    );
  }
}
