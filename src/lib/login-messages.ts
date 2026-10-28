/**
 * What the login screens tell a person when asking for a code.
 *
 * Messages are chosen from the HTTP status only, never from the server's error
 * text, so a user never sees English, stack traces or developer hints.
 * Shared by the server (normalisation) and every login screen (messages).
 */

import { apiJson } from "@/lib/api";

/**
 * Characters that copy-paste from Hebrew text or messaging apps slip in and that
 * no one types on purpose: zero-width spaces/joiners, LRM/RLM, bidi embeddings
 * and isolates, and the byte-order mark.
 */
const INVISIBLE_CHARS = /[​-‏‪-‮⁦-⁩﻿]/g;

/**
 * Cleans an email typed or pasted into a login form. Invisible characters are
 * removed anywhere; ordinary and non-breaking spaces only at the edges. A space
 * inside the address is left in place so it fails validation visibly instead of
 * silently becoming a different address.
 */
export function normalizeEmailInput(raw: string): string {
  return raw
    .replace(INVISIBLE_CHARS, "")
    .replace(/^[\s ]+|[\s ]+$/g, "")
    .toLowerCase();
}

export const LOGIN_MESSAGES = {
  invalidEmail: "כתובת המייל לא תקינה. בדקו שאין רווחים או טעות הקלדה",
  rateLimited: "ביקשתם יותר מדי קודים. אפשר לנסות שוב בעוד 15 דקות",
  temporary: "יש תקלה זמנית. נסו שוב בעוד דקה",
  offline: "אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב",
  invalidPhone: "מספר הנייד לא תקין. כתבו אותו כמו 050-1234567",
  phoneNotFound: "המספר הזה לא שמור אצלנו. התחברו עם המייל, או פנו אלינו כדי להוסיף את המספר",
  phoneSeveral: "המספר הזה שמור אצלנו בכמה חשבונות. התחברו עם המייל",
  phoneOff: "התחברות עם טלפון לא זמינה כרגע. התחברו עם המייל",
} as const;

/** The message for a failed code request, from its HTTP status (0 = no network). */
export function requestCodeErrorMessage(status: number): string {
  if (status === 0) return LOGIN_MESSAGES.offline;
  if (status === 400) return LOGIN_MESSAGES.invalidEmail;
  if (status === 429) return LOGIN_MESSAGES.rateLimited;
  return LOGIN_MESSAGES.temporary;
}

/** Shown once a code is on its way, naming the address so a typo is visible. */
export function sentHint(email: string): string {
  return `שלחנו קוד ל-${email}. לא הגיע תוך דקה? בדקו בספאם, או ודאו שהכתובת נכונה`;
}

export type RequestCodeResult = { ok: true; email: string } | { ok: false; message: string };

/** Asks the server for a login code and returns a message fit to show the user. */
export async function requestLoginCode(
  rawEmail: string,
  extra?: { phone?: string }
): Promise<RequestCodeResult> {
  const email = normalizeEmailInput(rawEmail);
  if (!email) return { ok: false, message: LOGIN_MESSAGES.invalidEmail };
  const phone = extra?.phone?.trim();
  const result = await apiJson<{ ok?: boolean }>("/api/auth/request-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, ...(phone ? { phone } : {}) }),
  });
  if (result.ok) return { ok: true, email };
  return { ok: false, message: requestCodeErrorMessage(result.status) };
}

/** The message for a failed code request by phone, from its HTTP status. */
export function requestPhoneCodeErrorMessage(status: number): string {
  if (status === 400) return LOGIN_MESSAGES.invalidPhone;
  if (status === 404) return LOGIN_MESSAGES.phoneNotFound;
  if (status === 409) return LOGIN_MESSAGES.phoneSeveral;
  if (status === 403) return LOGIN_MESSAGES.phoneOff;
  return requestCodeErrorMessage(status);
}

/** Asks the server to text a login code to the account with this mobile number. */
export async function requestPhoneLoginCode(
  rawPhone: string,
  role: "student" | "teacher" | "admin"
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!rawPhone.trim()) return { ok: false, message: LOGIN_MESSAGES.invalidPhone };
  const result = await apiJson<{ ok?: boolean }>("/api/auth/request-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ loginPhone: rawPhone, role }),
  });
  if (result.ok) return { ok: true };
  return { ok: false, message: requestPhoneCodeErrorMessage(result.status) };
}

/** Network or unexpected failure while verifying a code. */
export function verifyCodeErrorMessage(status: number, serverMessage: string): string {
  if (status === 0) return LOGIN_MESSAGES.offline;
  if (status >= 500) return LOGIN_MESSAGES.temporary;
  // 4xx messages from verify-code are written in Hebrew for the user.
  return serverMessage;
}

/** "da***@walla.com" — enough to recognise a log line, not enough to identify someone. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}
