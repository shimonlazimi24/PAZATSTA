"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./Button";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo.svg" alt="Paza" width={120} height={40} className="h-9 w-auto object-contain" />
          </Link>
          <div className="hidden gap-6 md:flex">
            <Link
              href="/#how"
              className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              איך זה עובד
            </Link>
            <Link
              href="/#subjects"
              className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              מקצועות
            </Link>
            <Link
              href="/teacher"
              className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              למורים
            </Link>
          </div>
        </div>
        <Link href="/book">
          <Button showArrow>קביעת שיעור</Button>
        </Link>
      </div>
    </nav>
  );
}
