/**
 * Israeli mobile numbers for login by phone.
 *
 * Phones are saved in whatever shape people typed them (050-1234567, +972 50…,
 * 0501234567). Login compares one canonical form: digits only, country code
 * first, no plus sign ("972501234567").
 */

const INVISIBLE_CHARS = /[​-‏‪-‮⁦-⁩﻿]/g;

/** "050-123 4567", "+972501234567", "972-50-1234567" → "972501234567"; anything else → null. */
export function normalizeIsraeliMobile(raw: string): string | null {
  const digits = raw.replace(INVISIBLE_CHARS, "").replace(/\D/g, "");
  let national: string;
  if (digits.startsWith("9720")) national = digits.slice(4);
  else if (digits.startsWith("972")) national = digits.slice(3);
  else if (digits.startsWith("0")) national = digits.slice(1);
  else national = digits;
  // Mobile numbers: 5X then 7 digits.
  if (!/^5\d{8}$/.test(national)) return null;
  return `972${national}`;
}

/** "972501234567" → "050-1234567", for showing a person their own number. */
export function displayIsraeliMobile(normalized: string): string {
  const national = `0${normalized.slice(3)}`;
  return `${national.slice(0, 3)}-${national.slice(3)}`;
}

/** "972501234567" → "050-***4567", enough to recognise a log line. */
export function maskPhone(normalized: string): string {
  const shown = displayIsraeliMobile(normalized);
  return `${shown.slice(0, 4)}***${shown.slice(-4)}`;
}

/**
 * The same normalisation in SQL, for matching saved phones in the database.
 * Kept next to the TypeScript version so the two never drift apart.
 */
export const SQL_NORMALIZED_PHONE = `(CASE
  WHEN regexp_replace(phone, '\\D', '', 'g') LIKE '9720%' THEN '972' || substr(regexp_replace(phone, '\\D', '', 'g'), 5)
  WHEN regexp_replace(phone, '\\D', '', 'g') LIKE '972%' THEN regexp_replace(phone, '\\D', '', 'g')
  WHEN regexp_replace(phone, '\\D', '', 'g') LIKE '0%' THEN '972' || substr(regexp_replace(phone, '\\D', '', 'g'), 2)
  ELSE '972' || regexp_replace(phone, '\\D', '', 'g')
END)`;
