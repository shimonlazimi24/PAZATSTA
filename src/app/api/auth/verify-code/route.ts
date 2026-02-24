import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyOTP } from "@/lib/otp";
import {
  createSession,
  getSessionCookieConfig,
  SESSION_COOKIE,
  sign,
} from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
    const roleParam = body.role;
    const role =
      roleParam === "student" || roleParam === "teacher" || roleParam === "admin"
        ? roleParam
        : "student";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    if (!email || code.length !== 6) {
      return NextResponse.json(
        { error: "נא להזין אימייל וקוד בן 6 ספרות" },
        { status: 400 }
      );
    }

    const loginCode = await prisma.loginCode.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    });
    if (!loginCode) {
      return NextResponse.json(
        { error: "לא נשלח קוד או שפג תוקף. נא לבקש קוד חדש." },
        { status: 400 }
      );
    }
    if (loginCode.expiresAt < new Date()) {
      await prisma.loginCode.delete({ where: { id: loginCode.id } });
      return NextResponse.json(
        { error: "פג תוקף הקוד. נא לבקש קוד חדש." },
        { status: 400 }
      );
    }
    if (loginCode.attempts >= MAX_ATTEMPTS) {
      await prisma.loginCode.delete({ where: { id: loginCode.id } });
      return NextResponse.json(
        { error: "ניסיונות רבים מדי. נא לבקש קוד חדש." },
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
      return NextResponse.json({ error: "קוד שגוי" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (role === "teacher" || role === "admin") {
      if (!user || user.role !== role) {
        return NextResponse.json(
          {
            error:
              role === "teacher"
                ? "חשבון מורה לא קיים עבור אימייל זה. נא לפנות לאדמין להגדרת מורה."
                : "חשבון אדמין לא קיים עבור אימייל זה. אם זה סביבת פיתוח, הרץ: npx prisma db seed",
          },
          { status: 403 }
        );
      }
    } else {
      // role === "student"
      if (user && user.role === "teacher") {
        return NextResponse.json(
          {
            error:
              "חשבון זה רשום כמורה. נא להתחבר דרך \"התחבר כמורה\" או להשתמש באימייל אחר לכניסה כתלמיד.",
          },
          { status: 403 }
        );
      }
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            role: "student",
            ...(phone ? { phone } : {}),
          },
        });
        try {
          await prisma.studentProfile.upsert({
            where: { userId: user.id },
            create: { userId: user.id },
            update: {},
          });
        } catch (profileErr) {
          console.error("[verify-code] StudentProfile upsert failed (run migrations?):", profileErr);
          // Continue so login succeeds; profile can be created on first /student/profile visit
        }
      } else if (phone) {
        await prisma.user.update({
          where: { id: user.id },
          data: { phone },
        });
      }
    }

    await prisma.loginCode.delete({ where: { id: loginCode.id } });
    const sessionId = await createSession(user.id);
    const cookieCfg = getSessionCookieConfig();
    const nextPath = typeof body.next === "string" ? body.next.trim() : "";
    const wantAdmin = nextPath === "/admin" && canAccessAdmin(user);
    const redirect = wantAdmin
      ? "/admin"
      : user.role === "student"
        ? "/book"
        : user.role === "teacher"
          ? "/teacher/dashboard"
          : user.role === "admin"
            ? "/login/admin"
            : "/";
    const res = NextResponse.json({ ok: true, role: user.role, redirect });
    res.cookies.set(SESSION_COOKIE, sign(sessionId), {
      ...cookieCfg,
      maxAge: cookieCfg.maxAge,
    });
    console.log("[verify-code] Session cookie set successfully (path=/, httpOnly, sameSite=lax)");
    return res;
  } catch (e) {
    console.error("[verify-code] Error:", e);
    const message = process.env.NODE_ENV === "development" && e instanceof Error
      ? e.message
      : "Verification failed";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
