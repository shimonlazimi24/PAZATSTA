"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "../LogoutButton";
import { BackLink } from "@/components/design/BackLink";
import { NavDrawer } from "@/components/layout/NavDrawer";
import { ADMIN_NAV, activeAdminHref } from "./admin-nav";

/** Grouped admin menu; shared by the desktop sidebar and the mobile drawer. */
function AdminNavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const active = activeAdminHref(pathname);
  return (
    <nav className="p-3 space-y-4" aria-label="תפריט ניהול">
      {ADMIN_NAV.map((group, gi) => (
        <div key={group.title ?? gi} className="space-y-1">
          {group.title && (
            <p className="px-3 pt-1 text-xs font-semibold text-[var(--color-text-muted)]">{group.title}</p>
          )}
          {group.items.map((item) => {
            const isActive = item.href === active;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center px-3 py-2 rounded-[var(--radius-input)] text-sm font-medium transition-colors min-h-[40px] ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

interface AdminShellProps {
  email: string;
  children: React.ReactNode;
}

export function AdminShell({ email, children }: AdminShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const showAdminNav = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex" dir="rtl">
      {/* Desktop sidebar - hidden on mobile */}
      {showAdminNav && (
        <aside className="hidden w-60 shrink-0 border-s border-[var(--color-border)] bg-white md:flex md:flex-col">
          <AdminNavList pathname={pathname} />
        </aside>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-[var(--color-border)] bg-white shrink-0">
          <div className="px-4 py-4 sm:px-6 space-y-2">
            <BackLink href="/book" label="חזרה" />
            {/* Logo on RIGHT, hamburger on LEFT (RTL) */}
            <div className="flex flex-row-reverse items-center justify-between gap-2">
              <div className="flex flex-row-reverse items-center gap-2 sm:gap-4 min-w-0">
                <div className="flex shrink-0">
                  <Logo alt="Paza" className="h-8 w-auto object-contain" width={100} height={28} />
                </div>
                <span className="text-[var(--color-text-muted)] hidden sm:inline">/</span>
                <h1 className="text-lg font-semibold text-[var(--color-text)] truncate">
                  ניהול
                </h1>
              </div>
              <div className="flex flex-row-reverse items-center gap-2 sm:gap-3 shrink-0">
                <LogoutButton />
                <span className="text-sm text-[var(--color-text-muted)] hidden sm:inline truncate max-w-[140px]">
                  {email}
                </span>
                {showAdminNav && (
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-input)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] md:hidden"
                    aria-label="פתח תפריט"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 w-full max-w-screen-lg mx-auto px-4 py-4 sm:px-6 sm:py-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Mobile drawer - admin nav */}
      {showAdminNav && (
        <NavDrawer open={drawerOpen} onClose={closeDrawer} title="תפריט ניהול">
          <AdminNavList pathname={pathname} onNavigate={closeDrawer} />
        </NavDrawer>
      )}
    </div>
  );
}
