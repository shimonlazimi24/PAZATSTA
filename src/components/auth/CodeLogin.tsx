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

/** "auto": the shared login screen; the server sends each account to its own area. */
type Role = "student" | "teacher" | "admin" | "auto";
type Method = "email" | "phone";

const HOME: Record<Role, string> = { student: "/student", teacher: "/teacher/dashboard", admin: "/admin", auto: "/" };

const inputCls =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 py-2 focus-visible:border-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-60";
const primaryCls =
  "w-full rounded-[var(--radius-input)] bg-[var(--color-primary)] py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50";
const linkCls = "text-sm text-[var(--color-primary)] underline hover:no-underline disabled:opacity-50";

type Methods = { phone: boolean; google: boolean };

// Which ways of logging in are on. Asked once, as soon as a login page loads,
// so the form opens ready instead of switching after the click.
let methodsCache: Methods | null = null;
let methodsPromise: Promise<Methods> | null = null;

function loadMethods(): Promise<Methods> {
  if (!methodsPromise) {
    methodsPromise = apiJson<{ phone?: boolean; google?: boolean }>("/api/auth/methods").then((r) => {
      const m = { phone: Boolean(r.ok && r.data?.phone), google: Boolean(r.ok && r.data?.google) };
      if (r.ok) methodsCache = m;
      else methodsPromise = null; // try again next time
      return m;
    });
  }
  return methodsPromise;
}

if (typeof window !== "undefined") void loadMethods();

interface CodeLoginProps {
  role: Role;
  /** Where to go after login when the server allows it, e.g. "/admin". */
  next?: string;
}

/**
 * Log in with Google, a code by SMS or a code by email. Each way is its own
 * section with its own button, so it is always clear which one you are using.
 * Used by every login screen so they all behave the same.
 */
export function CodeLogin({ role, next }: CodeLoginProps) {
  // Starts empty even when already known, so the server and browser render the same.
  const [methods, setMethods] = useState<Methods | null>(null);
  const phoneAvailable = Boolean(methods?.phone);
  const googleAvailable = Boolean(methods?.google);
  const [method, setMethod] = useState<Method>("email");
  const [step, setStep] = useState<"ask" | "code">("ask");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | "resend" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [googleError, setGoogleError] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    // Coming back from Google with a problem: say what happened.
    const reason = new URLSearchParams(window.location.search).get("google");
    if (reason && GOOGLE_ERRORS[reason]) setGoogleError(GOOGLE_ERRORS[reason]);
    const apply = (m: Methods) => {
      setMethods(m);
      if (m.phone) setMethod("phone");
    };
    if (methodsCache) apply(methodsCache);
    else
      loadMethods().then((m) => {
        if (alive) apply(m);
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

  async function send(m: Method): Promise<boolean> {
    const result = m === "phone" ? await requestPhoneLoginCode(phone, role) : await requestLoginCode(email);
    if (!result.ok) {
      setError(result.message);
      return false;
    }
    return true;
  }

  async function onSend(e: React.FormEvent, m: Method) {
    e.preventDefault();
    if (busy) return;
    setMethod(m);
    setBusy("send");
    setError("");
    setNotice("");
    // Move on only once the code is really on its way.
    if (await send(m)) setStep("code");
    setBusy(null);
  }

  async function onResend() {
    if (busy) return;
    setBusy("resend");
    setError("");
    setNotice("");
    if (await send(method)) setNotice("נשלח קוד חדש.");
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

  const googleButton = (
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
  );
  const divider = (
    <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
      <span className="h-px flex-1 bg-[var(--color-border)]" />
      או
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );

  if (step === "code") {
    return (
      <form onSubmit={onVerify} className="space-y-4">
        <p className="break-words text-sm text-[var(--color-text-muted)]">
          {usePhone ? (
            <>
              שלחנו SMS עם קוד ל-<bdi dir="ltr">{phone.trim()}</bdi>. לא הגיע תוך דקה? אפשר לשלוח קוד חדש
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

  // Still asking which methods are on (a moment, on a first visit): hold the
  // space instead of showing the email form and swapping it a second later.
  if (!methods) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="טוען">
        <div className="h-11 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-bg-muted)]" />
        <div className="h-11 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-bg-muted)]" />
        <div className="h-11 animate-pulse rounded-[var(--radius-input)] bg-[var(--color-bg-muted)]" />
      </div>
    );
  }

  const tabs: ReadonlyArray<readonly [Method, string]> = [
    ["phone", "קוד לטלפון"],
    ["email", "קוד למייל"],
  ];

  return (
    <form onSubmit={(e) => onSend(e, usePhone ? "phone" : "email")} className="space-y-4">
      {googleError && (
        <p className="text-sm text-red-700" role="alert">
          {googleError}
        </p>
      )}
      {googleAvailable && (
        <>
          {googleButton}
          {divider}
        </>
      )}

      {/* One switch, one field, one button: phone or email, never both at once. */}
      {phoneAvailable && (
        <div
          role="radiogroup"
          aria-label="איך לקבל את הקוד"
          className="grid grid-cols-2 gap-1 rounded-full bg-[var(--color-bg-muted)] p-1"
        >
          {tabs.map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={method === m}
              onClick={() => {
                setMethod(m);
                setError("");
              }}
              className={`rounded-full py-2 text-sm font-medium transition-colors ${
                method === m
                  ? "bg-white text-[var(--color-text)] shadow-sm"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
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
            placeholder="050-0000000"
            dir="ltr"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setError("");
            }}
            required
            className={inputCls}
            disabled={busy === "send"}
          />
        </div>
      ) : (
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-[var(--color-text)]">
            כתובת מייל
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            dir="ltr"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            required
            className={inputCls}
            disabled={busy === "send"}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy !== null} className={`${primaryCls} flex items-center justify-center gap-2`}>
        {busy === "send" ? (
          "שולח…"
        ) : (
          <>
            {usePhone ? "שלחו לי קוד לטלפון" : "שלחו לי קוד במייל"}
            <span aria-hidden>←</span>
          </>
        )}
      </button>
    </form>
  );
}
