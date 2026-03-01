"use client";

import { usePathname } from "next/navigation";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname?.startsWith("/login")) return null;
  return (
    <footer className="shrink-0 py-6 text-center text-sm text-[var(--color-text-muted)] opacity-70">
      זכויות יוצרים © פזצט״א
    </footer>
  );
}
