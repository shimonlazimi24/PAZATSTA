"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { areaOf, safeNext } from "@/lib/login-next";

const MODES = [
  { href: "/login/student", label: "התחבר כתלמיד", desc: "קביעת שיעורים והשיעורים שלי" },
  { href: "/login/teacher", label: "התחבר כמורה", desc: "ניהול זמינות, שיעורים ודיווחים" },
  { href: "/login/admin", label: "התחבר כאדמין", desc: "הגדרת מורים וסיכומי שיעורים" },
];

/** Pick who you are; each choice has its own login screen, so all three look and behave the same. */
function LoginChoices() {
  const next = safeNext(useSearchParams().get("next"));
  const area = next ? areaOf(next) : null;
  // Heading for a page (an email link): offer only the logins that can open it.
  const modes =
    area === "admin"
      ? MODES.filter((m) => m.href !== "/login/student")
      : area
        ? MODES.filter((m) => m.href === `/login/${area}`)
        : MODES;

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex justify-center">
        <Logo alt="Paza" className="h-10 w-auto" width={140} height={48} />
      </div>
      <h1 className="text-center text-2xl font-bold text-[var(--color-text)]">התחברות</h1>
      <div className="grid gap-4">
        {modes.map((m) => (
          <Link
            key={m.href}
            href={next ? `${m.href}?${new URLSearchParams({ next })}` : m.href}
            className="block rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 text-right shadow-sm transition hover:border-[var(--color-primary)] hover:shadow-md"
          >
            <p className="text-lg font-semibold text-[var(--color-text)]">{m.label}</p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex justify-center">
        <Logo alt="Paza" className="h-10 w-auto" width={140} height={48} />
      </div>
      <h1 className="text-center text-2xl font-bold text-[var(--color-text)]">התחברות</h1>
      <p className="text-center text-[var(--color-text-muted)]">טוען…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginChoices />
    </Suspense>
  );
}
