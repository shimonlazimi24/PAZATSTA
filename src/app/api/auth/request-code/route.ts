import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOTP, hashOTP } from "@/lib/otp";
import { sendLoginCode } from "@/lib/email";

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_EMAIL = 5;
const MAX_REQUESTS_PER_IP = 10;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip") ?? null;
}

export async function POST(req: Request) {
  const handlerStart = Date.now();
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
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "נא להזין כתובת אימייל תקינה" }, { status: 400 });
  }

  const ip = getClientIp(req);
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const useOtpRateLimit = await (async () => {
    try {
      const [emailCount, ipCount] = await Promise.all([
        prisma.otpRequest.count({ where: { email, createdAt: { gte: since } } }),
        ip ? prisma.otpRequest.count({ where: { ip, createdAt: { gte: since } } }) : 0,
      ]);
      if (emailCount >= MAX_REQUESTS_PER_EMAIL || ipCount >= MAX_REQUESTS_PER_IP) {
        return "rate_limited" as const;
      }
      return true as const;
    } catch {
      return false as const;
    }
  })();

  if (useOtpRateLimit === "rate_limited") {
    return NextResponse.json(
      { error: "יותר מדי בקשות. נסו שוב בעוד 15 דקות." },
      { status: 429 }
    );
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

  const dbStart = Date.now();
  try {
    if (useOtpRateLimit) {
      await prisma.$transaction([
        prisma.loginCode.deleteMany({ where: { email } }),
        prisma.loginCode.create({
          data: { email, codeHash, expiresAt, attempts: 0 },
        }),
        prisma.otpRequest.create({ data: { email, ip } }),
        prisma.otpRequest.deleteMany({ where: { createdAt: { lt: since } } }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.loginCode.deleteMany({ where: { email } }),
        prisma.loginCode.create({
          data: { email, codeHash, expiresAt, attempts: 0 },
        }),
      ]);
    }
  } catch (e) {
    console.error("[request-code] Database error:", (e as Error)?.message ?? e);
    return NextResponse.json(
      { error: "Failed to send code" },
      { status: 503 }
    );
  }
  const dbTime = Date.now() - dbStart;
  console.log(`[request-code] DB write: ${dbTime}ms`);

  // Must await in serverless (Netlify) - function exits when response returns,
  // so fire-and-forget would kill the email send before it completes.
  const emailStart = Date.now();
  let sent = false;
  try {
    sent = await sendLoginCode(email, code);
    const emailTime = Date.now() - emailStart;
    console.log(`[request-code] Email send: ${emailTime}ms, sent=${sent}`);
  } catch (e) {
    const emailTime = Date.now() - emailStart;
    console.error(`[request-code] Email failed after ${emailTime}ms:`, (e as Error)?.message ?? e);
  }

  const totalTime = Date.now() - handlerStart;
  console.log(`[request-code] Total handler: ${totalTime}ms`);

  return NextResponse.json({ ok: true, message: "Code sent" });
}
