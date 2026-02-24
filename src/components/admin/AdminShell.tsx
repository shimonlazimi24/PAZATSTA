"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "../LogoutButton";
import { BackLink } from "@/components/design/BackLink";

const MENU_ITEMS = [
  { id: "weekly", label: "לוח שבועי", href: "/admin" },
  { id: "pending", label: "שיעורים בהמתנה לאישור", href: "/admin?section=pending" },
  { id: "teacher", label: "הגדרת מורה", href: "/admin?section=teacher" },
  { id: "summary", label: "סיכום שיעורים", href: "/admin?section=summary" },
] as const;

interface AdminShellProps {
  email: string;
  children: React.ReactNode;
}

export function AdminShell({ email, children }: AdminShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "weekly";

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex" dir="rtl">
      {pathname === "/admin" && (
        <aside className="w-56 shrink-0 border-l border-[var(--color-border)] bg-white flex flex-col">
          <nav className="p-4 space-y-1">
            {MENU_ITEMS.map((item) => {
              const isActive =
                (item.id === "weekly" && !searchParams.get("section")) ||
                searchParams.get("section") === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`block px-3 py-2 rounded-[var(--radius-input)] text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--color-primary)] text-white"
                      : "text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-[var(--color-border)] bg-white shrink-0">
          <div className="px-4 py-4 sm:px-6 space-y-2">
            <BackLink href="/book" label="חזרה" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/book" className="flex shrink-0">
                  <Logo alt="Paza" className="h-8 w-auto object-contain" width={100} height={28} />
                </Link>
                <span className="text-[var(--color-text-muted)]">/</span>
                <h1 className="text-lg font-semibold text-[var(--color-text)]">
                  ניהול
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--color-text-muted)]">{email}</span>
                <LogoutButton />
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
