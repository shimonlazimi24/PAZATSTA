"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/design/Button";
import { LogoutButton } from "./LogoutButton";

interface AdminShellProps {
  email: string;
  children: React.ReactNode;
}

export function AdminShell({ email, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]" dir="rtl">
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex shrink-0">
              <Image src="/logo.svg" alt="Paza" width={100} height={28} className="h-8 w-auto object-contain" />
            </Link>
            <span className="text-[var(--color-text-muted)]">/</span>
            <h1 className="text-lg font-semibold text-[var(--color-text)]">
              ניהול משתמשים
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-muted)]">{email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
