"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { CodeLogin } from "@/components/auth/CodeLogin";
import { safeNext } from "@/lib/login-next";

/**
 * One login screen for everyone. The account behind the email (or Google, or
 * phone) decides where it leads: a teacher to the teacher area, an admin to
 * the admin area, a student (or a new email) to booking. The old per-role pages
 * under /login/* stay for links already sent in emails.
 */
function Login() {
  const next = safeNext(useSearchParams().get("next"));
  return <CodeLogin role="auto" next={next || undefined} />;
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex justify-center">
        <Logo alt="Paza" className="h-10 w-auto" width={140} height={48} />
      </div>
      <div className="space-y-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">כניסה למערכת</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">תלמידים, מורים וצוות נכנסים מכאן. נעביר אתכם לאזור שלכם.</p>
        </div>
        <Suspense fallback={<CodeLogin role="auto" />}>
          <Login />
        </Suspense>
      </div>
    </div>
  );
}
