import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOTP, hashOTP } from "@/lib/otp";
import { sendLoginCode } from "@/lib/email";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  let code: string;
  try {
    code = createOTP();
  } catch (e) {
    console.error("[request-code] OTP error:", e);
    return NextResponse.json({ error: "Failed to send code" }, { status: 500 });
  }
  const codeHash = hashOTP(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  try {
    await prisma.loginCode.deleteMany({ where: { email } });
    await prisma.loginCode.create({
      data: { email, codeHash, expiresAt, attempts: 0 },
    });
  } catch (e) {
    console.error("[request-code] Database error:", (e as Error)?.message ?? e);
    return NextResponse.json(
      { error: "Failed to send code" },
      { status: 503 }
    );
  }

  try {
    const emailSent = await sendLoginCode(email, code);
    return NextResponse.json({ ok: true, message: "Code sent", emailSent });
  } catch (e) {
    console.error("[request-code] Email error:", (e as Error)?.message ?? e);
    return NextResponse.json(
      { error: "Failed to send code" },
      { status: 503 }
    );
  }
}
