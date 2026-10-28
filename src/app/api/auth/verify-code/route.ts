import { NextResponse } from "next/server";
import { VerifyCodeSchema } from "@/lib/auth-schemas";
import { prisma } from "@/lib/db";
import { verifyOTP } from "@/lib/otp";
import { completeLogin } from "@/lib/complete-login";
import {
  getSessionCookieConfig,
  SESSION_COOKIE,
  sign,
} from "@/lib/auth";
import { normalizeIsraeliMobile } from "@/lib/phone";
import { findAccountByPhone } from "@/lib/phone-login";

const MAX_ATTEMPTS = 5;



export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = VerifyCodeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "נא להזין אימייל וקוד בן 6 ספרות" },
        { status: 400 }
      );
    }
    const { code, role, phone, loginPhone } = parsed.data;
    let email = parsed.data.email;
    if (loginPhone) {
      const normalized = normalizeIsraeliMobile(loginPhone);
      const account = normalized ? await findAccountByPhone(normalized, role) : null;
      if (!account || account.kind !== "found") {
        return NextResponse.json({ error: "לא נשלח קוד או שפג תוקף. נא לבקש קוד חדש." }, { status: 400 });
      }
      email = account.email;
    }
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

    const outcome = await completeLogin({
      email,
      role,
      phone,
      next: parsed.data.next,
      consume: async () => {
        await prisma.loginCode.deleteMany({ where: { id: loginCode.id } });
      },
    });
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }
    const { sessionId, redirect } = outcome;
    const cookieCfg = getSessionCookieConfig();
    const res = NextResponse.json({ ok: true, role: outcome.role, redirect });
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
      : "יש תקלה זמנית. נסו שוב בעוד דקה";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
