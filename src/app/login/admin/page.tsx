"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { apiJson } from "@/lib/api";
import {
  normalizeEmailInput,
  requestLoginCode,
  sentHint,
  verifyCodeErrorMessage,
  LOGIN_MESSAGES,
} from "@/lib/login-messages";

type Step = "email" | "code";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [sendMessage, setSendMessage] = useState("");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading" | "error">("idle");
  const [verifyMessage, setVerifyMessage] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);

  const emailTrimmed = normalizeEmailInput(email);
  const codeDigitsOnly = code.replace(/\D/g, "").slice(0, 6);

  useEffect(() => {
    if (step === "code") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!emailTrimmed || sendStatus === "sending") return;
    setSendMessage("");
    setSendStatus("sending");
    // Move to the code step only once the code is actually on its way.
    const result = await requestLoginCode(email);
    if (!result.ok) {
      setSendStatus("error");
      setSendMessage(result.message);
      return;
    }
    setSendStatus("sent");
    setStep("code");
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (verifyStatus === "loading" || codeDigitsOnly.length !== 6) return;
    setVerifyStatus("loading");
    setVerifyMessage("");
    try {
      const result = await apiJson<{ redirect?: string }>("/api/auth/verify-code", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailTrimmed,
          code: codeDigitsOnly,
          role: "admin",
          next: "/admin",
        }),
      });
      if (!result.ok) {
        setVerifyStatus("error");
        setVerifyMessage(verifyCodeErrorMessage(result.status, result.error || "אימות נכשל"));
        return;
      }
      const redirectPath = result.data?.redirect;
      const safePath = typeof redirectPath === "string" && redirectPath.startsWith("/") && !redirectPath.startsWith("//")
        ? redirectPath
        : "/admin";
      window.location.href = safePath;
    } catch {
      setVerifyStatus("error");
      setVerifyMessage(LOGIN_MESSAGES.temporary);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo alt="Paza" className="h-10 w-auto" width={140} height={48} />
        </div>
        <h1 className="text-2xl font-bold text-center text-[var(--color-text)]">
          כניסת מנהל
        </h1>
        <div className="space-y-4">
          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-login-email"
                  className="block text-sm font-medium text-[var(--color-text)] mb-1"
                >
                  אימייל
                </label>
                <input
                  id="admin-login-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (sendStatus === "error") {
                      setSendStatus("idle");
                      setSendMessage("");
                    }
                  }}
                  required
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:border-[var(--color-primary)]"
                />
              </div>
              {sendStatus === "error" && (
                <p className="text-sm text-red-600 text-center" role="alert">{sendMessage}</p>
              )}
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] text-[var(--color-text)] text-center"
                >
                  חזרה
                </Link>
                <button
                  type="submit"
                  disabled={sendStatus === "sending"}
                  className="flex-1 py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {sendStatus === "sending" ? "שולח…" : "שלח קוד"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-login-code"
                  className="block text-sm font-medium text-[var(--color-text)] mb-1"
                >
                  קוד
                </label>
                <input
                  ref={codeInputRef}
                  id="admin-login-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] text-center text-lg tracking-widest focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  disabled={verifyStatus === "loading"}
                />
              </div>
              <p className="text-sm text-[var(--color-text-muted)] text-center break-words">
                {sentHint(emailTrimmed)}
              </p>
              {verifyMessage && (
                <p className="text-sm text-red-600 text-center">{verifyMessage}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setSendStatus("idle");
                    setSendMessage("");
                  }}
                  disabled={sendStatus === "sending"}
                  className="px-4 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] text-[var(--color-text)]"
                >
                  שינוי כתובת
                </button>
                <button
                  type="submit"
                  disabled={verifyStatus === "loading" || codeDigitsOnly.length !== 6}
                  className="flex-1 py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {verifyStatus === "loading" ? "מאמת…" : "אימות"}
                </button>
              </div>
            </form>
          )}
        </div>
    </div>
  );
}
