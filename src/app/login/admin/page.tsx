"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { apiJson } from "@/lib/api";

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

  const emailTrimmed = email.trim().toLowerCase();
  const codeDigitsOnly = code.replace(/\D/g, "").slice(0, 6);

  useEffect(() => {
    if (step === "code") {
      codeInputRef.current?.focus();
    }
  }, [step]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!emailTrimmed) return;
    setSendMessage("");
    setSendStatus("sending");
    setStep("code");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendStatus("error");
        setSendMessage(data.error || "שליחת הקוד נכשלה");
        return;
      }
      setSendStatus("sent");
    } catch {
      setSendStatus("error");
      setSendMessage("שגיאת רשת");
    }
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
        setVerifyMessage(result.error || "אימות נכשל");
        return;
      }
      const redirectPath = result.data?.redirect;
      const safePath = typeof redirectPath === "string" && redirectPath.startsWith("/") && !redirectPath.startsWith("//")
        ? redirectPath
        : "/admin";
      router.push(safePath);
    } catch {
      setVerifyStatus("error");
      setVerifyMessage("שגיאה באימות. נסו שוב.");
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] text-[var(--color-text)] text-center"
                >
                  חזרה
                </Link>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                >
                  שלח קוד
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
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] text-center text-lg tracking-widest focus:ring-2 focus:ring-[var(--color-primary)]"
                  disabled={verifyStatus === "loading"}
                />
              </div>
              {sendStatus === "sending" && (
                <p className="text-sm text-[var(--color-text-muted)] text-center">שולחים קוד...</p>
              )}
              {sendStatus === "error" && (
                <p className="text-sm text-red-600 text-center">{sendMessage}</p>
              )}
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
                  חזרה
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
