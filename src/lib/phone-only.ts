/**
 * Students may sign up with a mobile number alone. Every account is keyed by an
 * email, so such an account gets a stand-in address that names the number and can
 * never receive mail (.invalid is reserved for exactly this).
 */
const NO_EMAIL_DOMAIN = "@no-email.invalid";

/** Where a new number's login code is kept until it is confirmed. */
export function phoneCodeKey(normalized: string): string {
  return `phone:${normalized}`;
}

/** "972547771234" -> "phone-0547771234@no-email.invalid" */
export function phoneOnlyEmail(normalized: string): string {
  return `phone-0${normalized.replace(/^972/, "")}${NO_EMAIL_DOMAIN}`;
}

/** True for the stand-in address of a student who signed up by phone. */
export function isPhoneOnlyEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(NO_EMAIL_DOMAIN));
}
