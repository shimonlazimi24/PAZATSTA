"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { apiJson } from "@/lib/api";

type LoginMode = "student" | "teacher" | "admin" | null;

const MODES: { value: LoginMode; label: string; desc: string }[] = [
  { value: "student", label: "התחבר כתלמיד", desc: "קביעת שיעורים והשיעורים שלי" },
  { value: "teacher", label: "התחבר כמורה", desc: "ניהול זמינות, שיעורים ודיווחים" },
  { value: "admin", label: "התחבר כאדמין", desc: "הגדרת מורים וסיכומי שיעורים" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextAdmin = searchParams.get("next") === "/admin";
  const [mode, setMode] = useState<LoginMode>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  // When next=/admin, only teacher/admin are valid — hide student for clean UX.
  const modesToShow = nextAdmin
    ? MODES.filter((m) => m.value !== "student")
    : MODES;

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (mode === null) {
      setMessage("נא לבחור סוג התחברות");
      setStatus("error");
      return;
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setStatus("loading");
    setMessage("");
    const result = await apiJson<{ emailSent?: boolean }>("/api/auth/request-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    if (!result.ok) {
      setStatus("error");
      setMessage(result.error);
      return;
    }
    const hint = result.data?.emailSent === false ? "&hint=noEmail" : "";
    const baseVerify = `/verify?email=${encodeURIComponent(trimmed)}&role=${mode}`;
    const verifyUrl = nextAdmin ? `${baseVerify}&next=/admin${hint}` : `${baseVerify}${hint}`;
    router.push(verifyUrl);
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
            {nextAdmin && (
              <p className="text-center text-sm text-[var(--color-primary)] bg-[var(--color-bg-muted)] rounded-[var(--radius-input)] py-2 px-3">
                כניסה לאזור הניהול: בחרו &quot;התחבר כמורה&quot; והזינו אימייל עם הרשאות מנהל.
              </p>
            )}
            <div className="grid gap-4">
              {modesToShow.map((m) =>
                m.value === "admin" ? (
                  <Link
                    key="admin"
                    href="/login/admin"
                    className="rounded-2xl border border-[var(--color-border)] bg-white p-6 text-right shadow-sm transition hover:border-[var(--color-primary)] hover:shadow-md block"
                  >
                    <p className="text-lg font-semibold text-[var(--color-text)]">
                      {m.label}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      {m.desc}
                    </p>
                  </Link>
                ) : (
                  <button
                    key={m.value ?? "x"}
                    type="button"
                    onClick={() => setMode(m.value!)}
                    className="rounded-2xl border border-[var(--color-border)] bg-white p-6 text-right shadow-sm transition hover:border-[var(--color-primary)] hover:shadow-md"
                  >
                    <p className="text-lg font-semibold text-[var(--color-text)]">
                      {m.label}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      {m.desc}
                    </p>
                  </button>
                )
              )}
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

function LoginFallback() {
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
        <p className="text-center text-[var(--color-text-muted)]">טוען…</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
