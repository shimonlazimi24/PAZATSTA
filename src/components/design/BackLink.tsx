"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface BackLinkProps {
  href: string;
  label?: string;
  className?: string;
  /** When true, navigates with cache-busting query to force fresh data (e.g. after completing a report) */
  refreshOnNavigate?: boolean;
}

export function BackLink({ href, label = "חזרה", className, refreshOnNavigate }: BackLinkProps) {
  const router = useRouter();

  if (refreshOnNavigate) {
    return (
      <button
        type="button"
        onClick={() => router.push(`${href}?r=${Date.now()}`)}
        className={cn(
          "inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors bg-transparent border-none cursor-pointer font-inherit",
          className
        )}
      >
        <span aria-hidden>←</span>
        {label}
      </button>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors",
        className
      )}
    >
      <span aria-hidden>←</span>
      {label}
    </Link>
  );
}
