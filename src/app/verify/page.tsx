"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/design/BackLink";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") ?? "";
  const roleParam = searchParams.get("role");
  const role =
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.replace(/\D/g, ""),
          role,
          next: nextParam || undefined,
          phone: phoneParam.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "אימות נכשל");
        return;
      }
      const redirect = data.redirect ?? "/";
      window.location.href = redirect;
    } catch {
      setStatus("error");
      setMessage("שגיאת רשת");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="text-center" dir="rtl">
            <h1 className="text-xl font-semibold text-[var(--color-text)]">הזנת קוד</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">נשלח קוד בן 6 ספרות לאימייל שלך</p>
            {hintNoEmail && (
              <p className="text-xs text-amber-700 bg-amber-50 rounded-[var(--radius-input)] py-2 px-3 mt-2">
                אימייל לא נשלח (RESEND לא מוגדר). הקוד מופיע בלוגים של השרת ב-Netlify.
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
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 6))}
                maxLength={6}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] text-center text-lg tracking-widest focus:ring-2 focus:ring-[var(--color-primary)]"
                disabled={status === "loading"}
              />
            </div>
            {message && <p className="text-sm text-red-600">{message}</p>}
            <button
              type="submit"
              disabled={status === "loading" || code.length !== 6}
              className="w-full py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {status === "loading" ? "מאמת…" : "אימות"}
            </button>
          </form>
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
