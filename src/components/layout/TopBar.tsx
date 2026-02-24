"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";

interface TopBarProps {
  title?: string;
}

function logoHrefForRole(role: string | undefined, canAccessAdmin?: boolean): string {
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "admin" || canAccessAdmin) return "/admin";
  return "/book";
}

export function TopBar({ title }: TopBarProps) {
  const [logoHref, setLogoHref] = useState("/book");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setLogoHref(logoHrefForRole(data.role, data.canAccessAdmin));
      })
      .catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-8">
      <div className="flex flex-1 items-center justify-end gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        )}
        <Link href={logoHref} className="shrink-0" aria-label="Paza">
          <Logo alt="Paza" className="h-7 w-auto object-contain" width={100} height={28} />
        </Link>
      </div>
    </header>
  );
}
