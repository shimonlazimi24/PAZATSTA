/**
 * Shared validation helpers for forms and API inputs.
 */

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/** Phone: 9–11 digits (after stripping non-digits). */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 11;
}

export const MAX_LENGTH_NAME = 200;
export const MAX_LENGTH_PHONE = 30;
