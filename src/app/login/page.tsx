"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

const MODES = [
  { href: "/login/student", label: "התחבר כתלמיד", desc: "קביעת שיעורים והשיעורים שלי" },
  { href: "/login/teacher", label: "התחבר כמורה", desc: "ניהול זמינות, שיעורים ודיווחים" },
  { href: "/login/admin", label: "התחבר כאדמין", desc: "הגדרת מורים וסיכומי שיעורים" },
];

/** Pick who you are; each choice has its own login screen, so all three look and behave the same. */
function LoginChoices() {
  const searchParams = useSearchParams();
  const nextAdmin = searchParams.get("next") === "/admin";
  // Heading for the admin area: a student login cannot get there.
  const modes = nextAdmin ? MODES.filter((m) => m.href !== "/login/student") : MODES;

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
            href={nextAdmin ? `${m.href}?next=/admin` : m.href}
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
