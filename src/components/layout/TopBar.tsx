"use client";

import { Logo } from "@/components/Logo";

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-8">
      <div className="flex flex-1 items-center justify-end gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        )}
        <div className="shrink-0" aria-hidden>
          <Logo alt="Paza" className="h-7 w-auto object-contain" width={100} height={28} />
        </div>
      </div>
    </header>
  );
}
