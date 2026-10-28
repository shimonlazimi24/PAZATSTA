/**
 * Sending login codes by SMS.
 *
 * No SMS provider is connected yet. Until one is:
 * - staging, preview and local development send the code by email instead
 *   (staging email goes to the QA inbox), so the whole phone flow can be tested;
 * - production does not offer login by phone at all.
 *
 * Connecting a provider means adding it to `providerFrom` and setting
 * SMS_PROVIDER plus its keys in Vercel. Nothing else changes.
 */

import { emailDeliveryMode } from "@/lib/email-guard";
import { sendLoginCode } from "@/lib/email";
import { maskPhone } from "@/lib/phone";

export type SmsMode = "provider" | "email-fallback" | "off";

type Env = Record<string, string | undefined>;

type SmsProvider = { send(toNormalized: string, text: string): Promise<void> };

/** The connected SMS provider, or null while none is set up. */
function providerFrom(env: Env): SmsProvider | null {
  void env.SMS_PROVIDER; // e.g. "019", "inforu", "twilio" once one is chosen
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
