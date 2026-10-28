"use client";

import { useEffect, useRef, useState } from "react";
import { apiJson } from "@/lib/api";
import { GOOGLE_ERRORS } from "@/lib/google-login";
import {
  LOGIN_MESSAGES,
  normalizeEmailInput,
  requestLoginCode,
  requestPhoneLoginCode,
  sentHint,
  verifyCodeErrorMessage,
} from "@/lib/login-messages";

type Role = "student" | "teacher" | "admin";
type Method = "email" | "phone";

const METHOD_KEY = "pazatsta-login-method";
const HOME: Record<Role, string> = { student: "/student", teacher: "/teacher/dashboard", admin: "/admin" };

const inputCls =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 py-2 focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-60";
const primaryCls =
  "w-full rounded-[var(--radius-input)] bg-[var(--color-primary)] py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50";
const linkCls = "text-sm text-[var(--color-primary)] underline hover:no-underline disabled:opacity-50";

function readMethod(): Method {
  try {
    return window.localStorage.getItem(METHOD_KEY) === "phone" ? "phone" : "email";
  } catch {
    return "email";
  }
}

function saveMethod(m: Method) {
  try {
    window.localStorage.setItem(METHOD_KEY, m);
  } catch {
    /* private mode: just don't remember */
  }
}

interface CodeLoginProps {
  role: Role;
  /** Where to go after login when the server allows it, e.g. "/admin". */
  next?: string;
  /** Students logging in by email may also leave a phone, saved on their account. */
  askStudentPhone?: boolean;
}

/**
 * Log in with a one-time code sent by email or, where SMS is available, by text
 * message. Used by every login screen so they all behave the same.
 */
export function CodeLogin({ role, next, askStudentPhone }: CodeLoginProps) {
  const [phoneAvailable, setPhoneAvailable] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [method, setMethod] = useState<Method>("email");
  const [step, setStep] = useState<"ask" | "code">("ask");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | "resend" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    // Coming back from Google with a problem: say what happened.
    const reason = new URLSearchParams(window.location.search).get("google");
    if (reason && GOOGLE_ERRORS[reason]) setError(GOOGLE_ERRORS[reason]);
    apiJson<{ phone?: boolean; google?: boolean }>("/api/auth/methods").then((r) => {
      if (!alive || !r.ok) return;
      if (r.data?.google) setGoogleAvailable(true);
      if (!r.data?.phone) return;
      setPhoneAvailable(true);
      setMethod(readMethod());
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  const usePhone = phoneAvailable && method === "phone";
  const cleanEmail = normalizeEmailInput(email);
  const digits = code.replace(/\D/g, "").slice(0, 6);

  function choose(m: Method) {
    setMethod(m);
    saveMethod(m);
    setError("");
  }

  async function send(): Promise<boolean> {
    const result = usePhone
      ? await requestPhoneLoginCode(phone, role)
      : await requestLoginCode(email, askStudentPhone ? { phone: studentPhone } : undefined);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    return true;
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy("send");
    setError("");
    setNotice("");
    // Move on only once the code is really on its way.
    if (await send()) setStep("code");
    setBusy(null);
  }

  async function onResend() {
    if (busy) return;
    setBusy("resend");
    setError("");
    setNotice("");
    if (await send()) setNotice("נשלח קוד חדש.");
    setBusy(null);
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    if (busy || digits.length !== 6) return;
    setBusy("verify");
    setError("");
    try {
      const result = await apiJson<{ redirect?: string }>("/api/auth/verify-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(usePhone ? { loginPhone: phone } : { email: cleanEmail }),
          code: digits,
          role,
          ...(next ? { next } : {}),
          ...(!usePhone && askStudentPhone && studentPhone.trim() ? { phone: studentPhone.trim() } : {}),
        }),
      });
      if (!result.ok) {
        setError(verifyCodeErrorMessage(result.status, result.error || "אימות נכשל"));
        setBusy(null);
        return;
      }
      const to = result.data?.redirect;
      window.location.href = typeof to === "string" && to.startsWith("/") && !to.startsWith("//") ? to : HOME[role];
    } catch {
      setError(LOGIN_MESSAGES.temporary);
      setBusy(null);
    }
  }

  function backToAsk() {
    setStep("ask");
    setCode("");
    setError("");
    setNotice("");
  }

  if (step === "code") {
    return (
      <form onSubmit={onVerify} className="space-y-4">
        <p className="break-words text-sm text-[var(--color-text-muted)]">
          {usePhone ? (
            <>
              שלחנו SMS עם קוד ל-<bdi dir="ltr">{phone.trim()}</bdi>. לא הגיע תוך דקה? אפשר לשלוח קוד חדש, או להתחבר עם המייל
            </>
          ) : (
            sentHint(cleanEmail)
          )}
        </p>
        <div>
          <label htmlFor="login-code" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            הקוד שקיבלתם
          </label>
          <input
            ref={codeRef}
            id="login-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            dir="ltr"
            className={`${inputCls} text-center text-lg tracking-widest`}
            disabled={busy === "verify"}
          />
        </div>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        {notice && <p className="text-sm text-green-700" role="status">{notice}</p>}
        <button type="submit" disabled={busy !== null || digits.length !== 6} className={primaryCls}>
          {busy === "verify" ? "מאמת…" : "כניסה"}
        </button>
        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" className={linkCls} onClick={backToAsk} disabled={busy !== null}>
            {usePhone ? "שינוי מספר" : "שינוי כתובת"}
          </button>
          <button type="button" className={linkCls} onClick={onResend} disabled={busy !== null}>
            {busy === "resend" ? "שולח…" : "שליחת קוד חדש"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onSend} className="space-y-4">
      {phoneAvailable && (
        <div role="radiogroup" aria-label="איך לקבל את הקוד" className="grid grid-cols-2 border-b border-[var(--color-border)]">
          {(
            [
              ["email", "במייל"],
              ["phone", "ב-SMS"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              onClick={() => choose(m)}
              className={`-mb-px border-b-2 py-2 text-sm font-medium ${
                method === m
                  ? "border-[var(--color-primary)] text-[var(--color-text)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {usePhone ? (
        <div>
          <label htmlFor="login-phone" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            מספר נייד
          </label>
          <input
            id="login-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="050-1234567"
            dir="ltr"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError("");
            }}
            required
            className={`${inputCls} text-right`}
            disabled={busy === "send"}
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">המספר ששמור אצלנו בחשבון שלכם.</p>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
              אימייל
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              dir="ltr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              required
              className={`${inputCls} text-right`}
              disabled={busy === "send"}
            />
          </div>
          {askStudentPhone && (
            <div>
              <label htmlFor="login-student-phone" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
                טלפון (רשות)
              </label>
              <input
                id="login-student-phone"
                type="tel"
                inputMode="tel"
                placeholder="050-1234567"
                dir="ltr"
                value={studentPhone}
                onChange={(e) => setStudentPhone(e.target.value)}
                className={`${inputCls} text-right`}
                disabled={busy === "send"}
              />
              {phoneAvailable && (
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">עם המספר הזה תוכלו להתחבר בפעם הבאה גם ב-SMS.</p>
              )}
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      <button type="submit" disabled={busy !== null} className={primaryCls}>
        {busy === "send" ? "שולח…" : "שלחו לי קוד"}
      </button>
      {googleAvailable && (
        <>
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            או
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>
          <a
            href={`/api/auth/google/start?${new URLSearchParams({ role, ...(next ? { next } : {}) })}`}
            className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white py-2.5 font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
          >
            <svg aria-hidden width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
              <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
            </svg>
            כניסה עם Google
          </a>
        </>
      )}
    </form>
  );
}
