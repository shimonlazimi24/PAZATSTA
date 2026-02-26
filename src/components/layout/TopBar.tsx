"use client";

import { Menu } from "lucide-react";
import { Logo } from "@/components/Logo";

interface TopBarProps {
  title?: string;
  /** When provided, shows hamburger on mobile to open nav drawer */
  onMenuClick?: () => void;
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 min-h-[44px] shrink-0 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 md:px-8">
      {/* Hamburger - mobile only, RTL: on the right (start) */}
      {onMenuClick && (
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-input)] text-foreground hover:bg-muted md:hidden"
          aria-label="פתח תפריט"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}
      <div className="flex flex-1 items-center justify-end gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
        )}
        <div className="shrink-0" aria-hidden>
          <Logo alt="Paza" className="h-7 w-auto object-contain" width={100} height={28} />
        </div>
      </div>
    </header>
  );
}
