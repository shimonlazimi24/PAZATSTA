/**
 * Shared validation helpers for forms and API inputs.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/** Email valid for delivery (excludes .local, localhost, test domains). */
export function isValidDeliveryEmail(value: string): boolean {
  const lower = value.toLowerCase().trim();
  if (!lower || !lower.includes("@")) return false;
  if (!EMAIL_REGEX.test(value.trim())) return false;
  if (lower.endsWith(".local") || lower.includes("@localhost")) return false;
  if (/@.*\.(local|test|example)$/i.test(lower)) return false;
  return true;
}

/**
 * Reduce a phone number to digits, converting the international Israeli form to
 * the local one: +972-50-2632320 and 050-2632320 are the same number, and users
 * type both.
 */
export function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!digits.startsWith("0") && digits.startsWith("972")) {
    return `0${digits.slice(3)}`;
  }
  return digits;
}

/** Phone: 9–11 digits once normalized. */
export function isValidPhone(value: string): boolean {
  const digits = normalizePhoneDigits(value);
  return digits.length >= 9 && digits.length <= 11;
}

export const MAX_LENGTH_NAME = 200;
export const MAX_LENGTH_PHONE = 30;
