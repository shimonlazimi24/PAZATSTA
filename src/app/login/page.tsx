"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

type LoginMode = "student" | "teacher" | null;

const MODES: { value: LoginMode; label: string; desc: string }[] = [
  { value: "student", label: "התחבר כתלמיד", desc: "קביעת שיעורים והשיעורים שלי" },
  { value: "teacher", label: "התחבר כמורה", desc: "ניהול זמינות, שיעורים ודיווחים" },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "שליחת הקוד נכשלה");
        return;
      }
      router.push(`/verify?email=${encodeURIComponent(trimmed)}&role=${mode}`);
    } catch {
      setStatus("error");
      setMessage("שגיאת רשת");
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--color-bg)]"
      dir="rtl"
    >
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo alt="Paza" className="h-10 w-auto" width={140} height={48} />
        </div>
        <h1 className="text-2xl font-bold text-center text-[var(--color-text)]">
          התחברות
        </h1>

        {mode === null ? (
          <>
            <p className="text-center text-[var(--color-text-muted)]">
              בחרו איך אתם נכנסים
            </p>
            <div className="grid gap-4">
              {MODES.map((m) => (
                <button
                  key={m.value ?? "x"}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className="rounded-2xl border border-[var(--color-border)] bg-white p-6 text-right shadow-sm transition hover:border-[var(--color-primary)] hover:shadow-md"
                >
                  <p className="text-lg font-semibold text-[var(--color-text)]">
                    {m.label}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    {m.desc}
                  </p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-center text-[var(--color-text-muted)]">
              {MODES.find((m) => m.value === mode)?.label}
            </p>
            <form onSubmit={handleSendCode} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-medium text-[var(--color-text)] mb-1"
                >
                  אימייל
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  disabled={status === "loading"}
                />
              </div>
              {message && (
                <p className="text-sm text-red-600">{message}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="px-4 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] text-[var(--color-text)]"
                >
                  חזרה
                </button>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="flex-1 py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {status === "loading" ? "שולח…" : "שלח קוד"}
                </button>
              </div>
            </form>
          </>
        )}

      </div>
    </div>
  );
}
