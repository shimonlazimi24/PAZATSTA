"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { CodeLogin } from "@/components/auth/CodeLogin";

type LoginMode = "student" | "teacher" | "admin" | null;

const MODES: { value: LoginMode; label: string; desc: string }[] = [
  { value: "student", label: "התחבר כתלמיד", desc: "קביעת שיעורים והשיעורים שלי" },
  { value: "teacher", label: "התחבר כמורה", desc: "ניהול זמינות, שיעורים ודיווחים" },
  { value: "admin", label: "התחבר כאדמין", desc: "הגדרת מורים וסיכומי שיעורים" },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const nextAdmin = searchParams.get("next") === "/admin";
  const [mode, setMode] = useState<LoginMode>(null);

  // When next=/admin, only teacher/admin are valid — hide student for clean UX.
  const modesToShow = nextAdmin
    ? MODES.filter((m) => m.value !== "student")
    : MODES;

  return (
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
            <CodeLogin role={mode} next={nextAdmin ? "/admin" : undefined} askStudentPhone={mode === "student"} />
            <button
              type="button"
              onClick={() => setMode(null)}
              className="block w-full text-center text-sm text-[var(--color-text-muted)] underline hover:no-underline"
            >
              חזרה לבחירת סוג כניסה
            </button>
          </>
        )}

    </div>
  );
}

function LoginFallback() {
  return (
    <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo alt="Paza" className="h-10 w-auto" width={140} height={48} />
        </div>
        <h1 className="text-2xl font-bold text-center text-[var(--color-text)]">
          התחברות
        </h1>
        <p className="text-center text-[var(--color-text-muted)]">טוען…</p>
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
