"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { BackLink } from "@/components/design/BackLink";
import { CodeLogin } from "@/components/auth/CodeLogin";

function TeacherLogin() {
  // A teacher with admin rights heading for the admin area lands there after login.
  const nextAdmin = useSearchParams().get("next") === "/admin";
  return <CodeLogin role="teacher" next={nextAdmin ? "/admin" : undefined} />;
}

export default function TeacherLoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <BackLink href="/login" label="חזרה לבחירת סוג כניסה" />
      <div className="flex justify-center">
        <Logo alt="Paza" className="h-9 w-auto object-contain" width={120} height={40} />
      </div>
      <div className="space-y-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-[var(--color-text)]">כניסה למורים</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">רק חשבונות מורים יכולים להיכנס מכאן.</p>
        </div>
        <Suspense fallback={<CodeLogin role="teacher" />}>
          <TeacherLogin />
        </Suspense>
      </div>
    </div>
  );
}
