/**
 * Sending login codes by SMS.
 *
 * No SMS provider is connected yet. Until one is:
 * - staging, preview and local development send the code by email instead
 *   (staging email goes to the QA inbox), so the whole phone flow can be tested;
 * - production does not offer login by phone at all.
 *
 * Turning SMS on means setting SMS_PROVIDER=019 plus its keys in Vercel.
 * Another provider can be added in `providerFrom`; nothing else changes.
 */

import { emailDeliveryMode } from "@/lib/email-guard";
import { sendLoginCode } from "@/lib/email";
import { maskPhone } from "@/lib/phone";

export type SmsMode = "provider" | "email-fallback" | "off";

type Env = Record<string, string | undefined>;

type SmsProvider = { send(toNormalized: string, text: string): Promise<void> };

/**
 * 019 SMS (docs.019sms.co.il). Needs SMS_019_USERNAME, SMS_019_TOKEN (created in
 * the 019 dashboard under הגדרות > ניהול Token API) and SMS_SENDER: the sender
 * name people see, up to 11 English letters or digits.
 */
function provider019(env: Env): SmsProvider | null {
  const username = env.SMS_019_USERNAME?.trim();
  const token = env.SMS_019_TOKEN?.trim();
  const sender = env.SMS_SENDER?.trim();
  if (!username || !token || !sender) return null;
  const url = env.SMS_019_TEST === "1" ? "https://019sms.co.il/api/test" : "https://019sms.co.il/api";
  return {
    async send(toNormalized, text) {
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          sms: {
            user: { username },
            source: sender,
            destinations: { phone: [{ _: `0${toNormalized.slice(3)}` }] },
            message: text,
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const data = (await res.json().catch(() => null)) as { status?: number | string; message?: string } | null;
      if (!res.ok || Number(data?.status) !== 0) {
        throw new Error(`019 refused: http ${res.status}, status ${data?.status ?? "?"}, ${data?.message ?? ""}`);
      }
    },
  };
}

/** The connected SMS provider, or null while none is set up. */
function providerFrom(env: Env): SmsProvider | null {
  if (env.SMS_PROVIDER?.trim() === "019") return provider019(env);
  return null;
}

export function smsMode(env: Env): SmsMode {
  if (providerFrom(env)) return "provider";
  const local = !env.VERCEL_ENV && env.NODE_ENV !== "production";
  if (local || emailDeliveryMode(env).kind !== "live") return "email-fallback";
  return "off";
}

export function phoneLoginEnabled(env: Env = process.env): boolean {
  return smsMode(env) !== "off";
}

export function loginCodeSmsText(code: string): string {
  return `קוד ההתחברות שלך לפזצט״א: ${code}\nתוקף: 10 דקות.`;
}

/**
 * Sends a login code to a phone. `accountEmail` is the account's email, used
 * only by the testing fallback. Throws if nothing could be sent.
 */
export async function sendLoginCodeSms(toNormalized: string, code: string, accountEmail: string): Promise<void> {
  const provider = providerFrom(process.env);
  if (provider) {
    await provider.send(toNormalized, loginCodeSmsText(code));
    return;
  }
  if (smsMode(process.env) === "email-fallback") {
    console.log("[sms] no provider yet, sending the code for", maskPhone(toNormalized), "by email");
    await sendLoginCode(accountEmail, code);
    return;
  }
  throw new Error("SMS login is not available");
}
