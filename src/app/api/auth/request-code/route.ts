import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createOTP, hashOTP } from "@/lib/otp";
import { sendLoginCode } from "@/lib/email";
import { EMAIL_REGEX } from "@/lib/validation";
import { maskEmail, normalizeEmailInput } from "@/lib/login-messages";
import { maskPhone, normalizeIsraeliMobile } from "@/lib/phone";
import { findAccountByPhone, type LoginRole } from "@/lib/phone-login";
import { phoneLoginEnabled, sendLoginCodeSms } from "@/lib/sms";

const OTP_TTL_MINUTES = 10;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_EMAIL = 5;
const MAX_REQUESTS_PER_IP = 10;

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip") ?? null;
}

export async function POST(req: Request) {
  const handlerStart = Date.now();
  let body: { email?: unknown; loginPhone?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Login by phone: find the account by its saved mobile number, then go on
  // exactly as for email, keyed by that account's email.
  let phoneTo: string | null = null;
  let email: string;
  const ip = getClientIp(req);
  if (typeof body.loginPhone === "string") {
    if (!phoneLoginEnabled()) {
      return NextResponse.json({ error: "phone_login_off" }, { status: 403 });
    }
    const normalized = normalizeIsraeliMobile(body.loginPhone);
    if (!normalized) {
      console.warn("[request-code] rejected: invalid_phone");
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }
    // Checked before the lookup, so the lookup cannot be used to probe many numbers.
    if (ip) {
      const recent = await prisma.otpRequest
        .count({ where: { ip, createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) } } })
        .catch((e) => {
          console.error("[request-code] ip rate-limit check failed, allowing", (e as Error)?.message ?? e);
          return 0;
        });
      if (recent >= MAX_REQUESTS_PER_IP) {
        console.warn("[request-code] rejected: rate_limited_ip", maskPhone(normalized));
        return NextResponse.json({ error: "יותר מדי בקשות. נסו שוב בעוד 15 דקות." }, { status: 429 });
      }
    }
    const role: LoginRole = body.role === "teacher" || body.role === "admin" ? body.role : "student";
    let account;
    try {
      account = await findAccountByPhone(normalized, role);
    } catch (e) {
      console.error("[request-code] rejected: db_error", maskPhone(normalized), (e as Error)?.message ?? e);
      return NextResponse.json({ error: "Failed to send code" }, { status: 503 });
    }
    if (account.kind !== "found") {
      console.warn(`[request-code] rejected: phone_${account.kind}`, maskPhone(normalized), role);
      // A miss counts against the IP too, so numbers cannot be probed one after another.
      if (ip) await prisma.otpRequest.create({ data: { email: "phone-lookup", ip } }).catch(() => {});
      return NextResponse.json({ error: account.kind === "none" ? "phone_not_found" : "phone_several" }, { status: account.kind === "none" ? 404 : 409 });
    }
    email = account.email;
    phoneTo = normalized;
  } else {
    email = typeof body.email === "string" ? normalizeEmailInput(body.email) : "";
    if (!email) {
      console.warn("[request-code] rejected: missing_email");
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    if (!EMAIL_REGEX.test(email)) {
      console.warn("[request-code] rejected: invalid_email", maskEmail(email));
      return NextResponse.json({ error: "נא להזין כתובת אימייל תקינה" }, { status: 400 });
    }
  }

  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const useOtpRateLimit = await (async () => {
    try {
      const [emailCount, ipCount] = await Promise.all([
        prisma.otpRequest.count({ where: { email, createdAt: { gte: since } } }),
        ip ? prisma.otpRequest.count({ where: { ip, createdAt: { gte: since } } }) : 0,
      ]);
      if (emailCount >= MAX_REQUESTS_PER_EMAIL) {
        console.warn("[request-code] rejected: rate_limited_email", maskEmail(email));
        return "rate_limited" as const;
      }
      if (ipCount >= MAX_REQUESTS_PER_IP) {
        console.warn("[request-code] rejected: rate_limited_ip", maskEmail(email));
        return "rate_limited" as const;
      }
      return true as const;
    } catch (e) {
      console.error("[request-code] rate limit check failed, continuing without it:", (e as Error)?.message ?? e);
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
    console.error("[request-code] rejected: db_error", maskEmail(email), (e as Error)?.message ?? e);
    return NextResponse.json(
      { error: "Failed to send code" },
      { status: 503 }
    );
  }

  // Must await in serverless — the function can exit when the response returns,
  // so fire-and-forget would kill the send before it completes.
  if (phoneTo) {
    try {
      await sendLoginCodeSms(phoneTo, code, email);
    } catch (e) {
      console.error("[request-code] SMS send failed:", maskPhone(phoneTo), (e as Error)?.message ?? e);
      return NextResponse.json({ error: "Failed to send code" }, { status: 503 });
    }
  } else {
    try {
      await sendLoginCode(email, code);
    } catch (e) {
      console.error("[request-code] Email send failed:", (e as Error)?.message ?? e);
    }
  }

  console.log(`[request-code] handled in ${Date.now() - handlerStart}ms`);
  return NextResponse.json({ ok: true, message: "Code sent" });
}
