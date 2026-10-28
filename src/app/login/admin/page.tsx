"use client";

import { Logo } from "@/components/Logo";
import { BackLink } from "@/components/design/BackLink";
import { CodeLogin } from "@/components/auth/CodeLogin";

export default function AdminLoginPage() {
  return (
    <div className="w-full max-w-sm space-y-6">
      <BackLink href="/login" label="חזרה לבחירת סוג כניסה" />
      <div className="flex justify-center">
        <Logo alt="Paza" className="h-9 w-auto object-contain" width={120} height={40} />
      </div>
      <div className="space-y-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6">
        <h1 className="text-center text-xl font-semibold text-[var(--color-text)]">כניסת מנהל</h1>
        <CodeLogin role="admin" next="/admin" />
      </div>
    </div>
  );
}
