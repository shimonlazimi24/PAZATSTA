/**
 * Keeps any environment other than production from emailing real people.
 *
 * Preview and staging deployments run the same code as production. Without this
 * guard, a reminder cron or a test booking on staging would email real students,
 * parents and teachers. The guard sits on the single Resend client, so every send
 * path, including ones added later, passes through it.
 *
 * - production:             delivered as addressed. EMAIL_REDIRECT_TO is ignored,
 *                           so a mis-scoped variable can never hijack customer mail.
 * - preview / development:  sent only to EMAIL_REDIRECT_TO, with the real recipient
 *                           shown in the subject. Without it, nothing is sent at all.
 * - not on Vercel (local):  delivered as addressed; local .env has no real key.
 *
 * APP_ENV=staging forces the non-production rules even if VERCEL_ENV is missing,
 * so staging never depends on Vercel exposing its system variables.
 */

export type DeliveryMode =
  | { kind: "live" }
  | { kind: "redirect"; to: string }
  | { kind: "blocked" };

const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads VERCEL_ENV, APP_ENV and EMAIL_REDIRECT_TO; pass process.env. */
export function emailDeliveryMode(env: Record<string, string | undefined>): DeliveryMode {
  const isStaging = env.APP_ENV?.trim().toLowerCase() === "staging";
  const vercelEnv = env.VERCEL_ENV?.trim();
  if (!isStaging && (vercelEnv === "production" || !vercelEnv)) return { kind: "live" };
  const redirect = env.EMAIL_REDIRECT_TO?.trim().toLowerCase() ?? "";
  if (SIMPLE_EMAIL.test(redirect)) return { kind: "redirect", to: redirect };
  return { kind: "blocked" };
}

type Addressed = {
  to: string | string[];
  subject: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
};

const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Re-addresses one message to the test inbox, naming who it was really for. */
export function redirectMessage<T extends Addressed>(message: T, to: string): T {
  const original = [...list(message.to), ...list(message.cc), ...list(message.bcc)].join(", ");
  const copy: T = { ...message, to, subject: `[STAGING → ${original}] ${message.subject}` };
  delete copy.cc;
  delete copy.bcc;
  return copy;
}
