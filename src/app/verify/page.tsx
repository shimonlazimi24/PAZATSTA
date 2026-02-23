"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackLink } from "@/components/design/BackLink";
import { apiJson } from "@/lib/api";

type Role = "student" | "teacher" | "admin";

/** Open-redirect prevention: allow only relative paths that do not start with "//". */
function safeRedirectPath(path: unknown, role: Role): string {
  if (typeof path === "string" && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  if (role === "student") return "/student";
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "admin") return "/admin";
  return "/";
}

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";
  const roleParam = searchParams.get("role");
  const role: Role =
    roleParam === "student" || roleParam === "teacher" || roleParam === "admin"
      ? roleParam
      : "student";
  const nextParam = searchParams.get("next") ?? "";
  const hintNoEmail = searchParams.get("hint") === "noEmail";
  const phoneParam = searchParams.get("phone") ?? "";

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [resendMessage, setResendMessage] = useState("");
  const userHasEditedEmailRef = useRef(false);

  useEffect(() => {
    if (!userHasEditedEmailRef.current || !email.trim()) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleEmailChange = (value: string) => {
    userHasEditedEmailRef.current = true;
    setEmail(value);
  };

  const codeDigitsOnly = code.replace(/\D/g, "").slice(0, 6);
  const emailTrimmed = email.trim().toLowerCase();
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    const result = await apiJson<{ redirect?: string }>("/api/auth/verify-code", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailTrimmed,
        code: codeDigitsOnly,
        role,
        next: nextParam || undefined,
        phone: phoneParam.trim() || undefined,
      }),
    });
    if (!result.ok) {
      setStatus("error");
      setMessage(result.error || "אימות נכשל");
      return;
    }
    const safePath = safeRedirectPath(result.data.redirect, role);
    router.push(safePath);
  }

  async function handleResend() {
    if (resendStatus === "loading" || !isEmailValid) return;
    setResendMessage("");
    setResendStatus("loading");
    const result = await apiJson<{ emailSent?: boolean }>("/api/auth/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailTrimmed,
        phone: phoneParam.trim() || undefined,
      }),
    });
    setResendStatus(result.ok ? "success" : "error");
    setResendMessage(result.ok ? "נשלח קוד חדש" : result.error);
  }

  const hintNoEmailText =
    process.env.NODE_ENV === "production"
      ? "שליחת אימייל לא זמינה כרגע. פנו לתמיכה."
      : "אימייל לא נשלח (RESEND לא מוגדר). הקוד מופיע בלוגים של השרת ב-Netlify.";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="text-center" dir="rtl">
            <h1 className="text-xl font-semibold text-[var(--color-text)]">הזנת קוד</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">נשלח קוד בן 6 ספרות לאימייל שלך</p>
            {hintNoEmail && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-[var(--radius-input)] py-2 px-3 mt-2">
                {hintNoEmailText}
              </p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            <div>
              <label htmlFor="verify-email" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                אימייל
              </label>
              <input
                id="verify-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] focus:ring-2 focus:ring-[var(--color-primary)]"
                disabled={status === "loading"}
              />
            </div>
            <div>
              <label htmlFor="verify-code" className="block text-sm font-medium text-[var(--color-text)] mb-1">
                קוד
              </label>
              <input
                id="verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                autoFocus
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] text-center text-lg tracking-widest focus:ring-2 focus:ring-[var(--color-primary)]"
                disabled={status === "loading"}
              />
            </div>
            {message && <p className="text-sm text-red-600">{message}</p>}
            <button
              type="submit"
              disabled={status === "loading" || codeDigitsOnly.length !== 6}
              className="w-full py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {status === "loading" ? "מאמת…" : "אימות"}
            </button>
          </form>
          <div className="space-y-2" dir="rtl">
            <button
              type="button"
              onClick={handleResend}
              disabled={status === "loading" || resendStatus === "loading" || !isEmailValid || hintNoEmail}
              className="w-full py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
              title={hintNoEmail ? hintNoEmailText : undefined}
            >
              {resendStatus === "loading" ? "שולח…" : "שלחו שוב קוד"}
            </button>
            {resendMessage && (
              <p className={`text-sm text-center ${resendStatus === "success" ? "text-green-600" : "text-red-600"}`}>
                {resendMessage}
              </p>
            )}
          </div>
          <p className="text-center text-sm text-[var(--color-text-muted)]">
            <BackLink href="/login" label="חזרה להתחברות" />
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <VerifyForm />
    </Suspense>
  );
}
