/**
 * Variables the app needs in production.
 *
 * Each fails differently when missing, and two of those failures are silent: an
 * unset ADMIN_NOTIFICATION_EMAILS means approval mail has no recipient, and an
 * unset CRON_SECRET means every cron returns 503. Neither shows up as a broken
 * page, so a deployment can look healthy while doing nothing.
 */
export const REQUIRED_IN_PRODUCTION = [
  "DATABASE_URL",
  "COOKIE_SECRET",
  "CRON_SECRET",
  "ADMIN_NOTIFICATION_EMAILS",
  "RESEND_API_KEY",
  "APP_URL",
] as const;

export type RequiredVar = (typeof REQUIRED_IN_PRODUCTION)[number];

/** Names of required variables that are unset, blank, or an obvious placeholder. */
export function missingConfig(
  env: Record<string, string | undefined> = process.env
): RequiredVar[] {
  return REQUIRED_IN_PRODUCTION.filter((name) => {
    const value = env[name]?.trim();
    if (!value) return true;
    // Shorter than this and getSigningSecret would reject it anyway.
    if (name === "COOKIE_SECRET" && value.length < 32) return true;
    if (name === "RESEND_API_KEY" && value === "re_xxxx") return true;
    return false;
  });
}
