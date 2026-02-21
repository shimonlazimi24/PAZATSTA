import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOTP, hashOTP } from "@/lib/otp";
import { sendLoginCode } from "@/lib/email";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    // Students can always request a code (self-signup). Teachers/admins need an invite (enforced at verify).
    const code = createOTP();
    const codeHash = hashOTP(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await prisma.loginCode.deleteMany({ where: { email } });
    await prisma.loginCode.create({
      data: { email, codeHash, expiresAt, attempts: 0 },
    });

    await sendLoginCode(email, code);
    return NextResponse.json({ ok: true, message: "Code sent" });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[request-code] Error:", e);
    }
    return NextResponse.json(
      { error: "Failed to send code" },
      { status: 500 }
    );
  }
}
