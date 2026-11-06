import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession, createSession, getSessionCookieConfig, SESSION_COOKIE, sign } from "@/lib/auth";
import { createOTP, hashOTP, verifyOTP } from "@/lib/otp";
import { sendLoginCode } from "@/lib/email";
import { sendLoginCodeSms, phoneLoginEnabled } from "@/lib/sms";
import { displayIsraeliMobile, normalizeIsraeliMobile } from "@/lib/phone";
import { findAccountByPhone } from "@/lib/phone-login";
import { isPhoneOnlyEmail, phoneOnlyEmail } from "@/lib/phone-only";
import { normalizeEmailInput } from "@/lib/login-messages";
import { EMAIL_REGEX } from "@/lib/validation";
import { mergeStudentAccounts } from "@/lib/student-merge";

export const dynamic = "force-dynamic";

const CODE_TTL_MS = 10 * 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS = 5;
const MAX_SENDS_PER_DAY = 10;
const MAX_ATTEMPTS = 5;

type Target = { kind: "email"; value: string } | { kind: "phone"; value: string };

function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** Reads what the student wants to add: an email or a mobile number. */
function readTarget(body: Record<string, unknown>): Target | string {
  if (typeof body.email === "string") {
    const email = normalizeEmailInput(body.email);
    if (!EMAIL_REGEX.test(email) || isPhoneOnlyEmail(email)) return "כתובת המייל לא תקינה";
    return { kind: "email", value: email };
  }
  if (typeof body.phone === "string") {
    const phone = normalizeIsraeliMobile(body.phone);
    if (!phone) return "מספר הנייד לא תקין. כתבו אותו כמו 050-1234567";
    return { kind: "phone", value: phone };
  }
  return "חסר מייל או נייד";
}

/** One code per student and target, so a code for one address cannot confirm another. */
const codeKey = (userId: string, t: Target) => `link:${userId}:${t.kind}:${t.value}`;

/**
 * A student adds a second way to log in: an email to a phone-only account, or a
 * mobile number to an email account. A code to that address proves it is theirs.
 * When the address already belongs to another student account, the two accounts
 * become one, so the student keeps a single history whichever way they log in.
 *
 * POST { step: "send", email | phone }          -> sends a code
 * POST { step: "verify", email | phone, code }  -> links (and merges if needed)
 */
export async function POST(req: Request) {
  const user = await getUserFromSession();
  if (!user || user.role !== "student") return fail("Forbidden", 403);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return fail("בקשה לא תקינה");

  const target = readTarget(body);
  if (typeof target === "string") return fail(target);
  if (target.kind === "email" && !isPhoneOnlyEmail(user.email)) return fail("לחשבון הזה כבר יש מייל");
  if (target.kind === "phone" && !phoneLoginEnabled()) return fail("אימות נייד לא זמין כרגע", 403);

  // Who already uses this address, if anyone.
  const owner =
    target.kind === "email"
      ? await prisma.user.findUnique({ where: { email: target.value }, select: { id: true, role: true, email: true } })
      : await phoneOwner(target.value);
  if (owner === "several") return fail("המספר הזה שמור בכמה חשבונות. פנו אלינו ונסדר את זה", 409);
  if (owner && owner.id !== user.id && owner.role !== "student") {
    return fail("הכתובת הזו שייכת לחשבון של מורה. השתמשו בכתובת אחרת", 409);
  }
  // A number already on another account that has its own email: we cannot tell
  // which account to keep, so ask the student to log in with that one instead.
  if (target.kind === "phone" && owner && owner.id !== user.id && !isPhoneOnlyEmail(owner.email)) {
    return fail("המספר הזה כבר שמור בחשבון אחר. התחברו איתו, או פנו אלינו", 409);
  }

  const key = codeKey(user.id, target);

  if (body.step === "send") {
    // Counted per student (any address) and per day, so codes cannot be sprayed
    // at many numbers: every SMS costs money.
    const since = new Date(Date.now() - WINDOW_MS);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const mine = { email: { startsWith: `link:${user.id}:` } };
    const [recent, today] = await Promise.all([
      prisma.otpRequest.count({ where: { ...mine, createdAt: { gte: since } } }),
      prisma.otpRequest.count({ where: { ...mine, createdAt: { gte: dayAgo } } }),
    ]);
    if (recent >= MAX_SENDS || today >= MAX_SENDS_PER_DAY) {
      return fail("ביקשתם יותר מדי קודים. אפשר לנסות שוב מאוחר יותר", 429);
    }
    const code = createOTP();
    await prisma.$transaction([
      prisma.loginCode.deleteMany({ where: { email: key } }),
      prisma.loginCode.create({ data: { email: key, codeHash: hashOTP(code), expiresAt: new Date(Date.now() + CODE_TTL_MS), attempts: 0 } }),
      prisma.otpRequest.create({ data: { email: key } }),
    ]);
    try {
      if (target.kind === "email") await sendLoginCode(target.value, code);
      else await sendLoginCodeSms(target.value, code, user.email);
    } catch (e) {
      console.error("[link-login] send failed:", (e as Error)?.message ?? e);
      return fail("יש תקלה זמנית בשליחת הקוד. נסו שוב בעוד דקה", 503);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.step !== "verify") return fail("בקשה לא תקינה");
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  const row = await prisma.loginCode.findFirst({ where: { email: key }, orderBy: { createdAt: "desc" } });
  if (!row || row.expiresAt < new Date() || row.attempts >= MAX_ATTEMPTS) {
    if (row) await prisma.loginCode.delete({ where: { id: row.id } }).catch(() => {});
    return fail("הקוד פג או שלא נשלח. בקשו קוד חדש");
  }
  if (code.length !== 6 || !verifyOTP(code, row.codeHash)) {
    await prisma.loginCode.update({ where: { id: row.id }, data: { attempts: row.attempts + 1 } });
    return fail("קוד שגוי");
  }
  await prisma.loginCode.delete({ where: { id: row.id } });

  // Which account stays: the one that already has a real email.
  let keptId = user.id;
  if (target.kind === "email") {
    if (owner && owner.id !== user.id) {
      await mergeStudentAccounts(user.id, owner.id);
      keptId = owner.id;
    } else {
      await prisma.user.update({ where: { id: user.id }, data: { email: target.value } });
    }
  } else {
    if (owner && owner.id !== user.id) await mergeStudentAccounts(owner.id, user.id);
    // A phone-only account is found by its stand-in address too: move it to the
    // new number, so the old number no longer opens this account.
    await prisma.user.update({
      where: { id: user.id },
      data: {
        phone: displayIsraeliMobile(target.value),
        ...(isPhoneOnlyEmail(user.email) ? { email: phoneOnlyEmail(target.value) } : {}),
      },
    });
  }

  const res = NextResponse.json({ ok: true, merged: Boolean(owner && owner.id !== user.id) });
  if (keptId !== user.id) {
    // This account was folded into the other one: continue logged in as that one.
    const cfg = getSessionCookieConfig();
    res.cookies.set(SESSION_COOKIE, sign(await createSession(keptId)), { ...cfg, maxAge: cfg.maxAge });
  }
  return res;
}

async function phoneOwner(normalized: string) {
  const found = await findAccountByPhone(normalized, "student");
  if (found.kind === "several") return "several" as const;
  if (found.kind === "none") return null;
  return prisma.user.findUnique({ where: { email: found.email }, select: { id: true, role: true, email: true } });
}
