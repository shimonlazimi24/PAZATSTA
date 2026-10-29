"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  BellRing,
  CalendarDays,
  ChevronDown,
  Clock,
  Inbox,
  Lightbulb,
  ListChecks,
  LogOut,
  Menu,
  Presentation,
  Receipt,
  School,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { NavDrawer } from "@/components/layout/NavDrawer";
import { ADMIN_NAV, activeAdminHref } from "./admin-nav";

const ICONS: Record<string, LucideIcon> = {
  "/admin": Inbox,
  "/admin/calendar": CalendarDays,
  "/admin/pending": Clock,
  "/admin/workshop": Presentation,
  "/admin/group-lessons": Users,
  "/admin/frontal-days": School,
  "/admin/teachers": UserRound,
  "/admin/reminders": BellRing,
  "/admin/hours": Receipt,
  "/admin/statistics": BarChart3,
  "/admin/settings/tips": Lightbulb,
  "/admin/settings/report-fields": ListChecks,
};

const COLLAPSED_KEY = "pazatsta-admin-nav-collapsed";

function readCollapsed(): string[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(COLLAPSED_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function AdminNav({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  const active = activeAdminHref(pathname);
  // Titles of the groups the admin closed; remembered on this device.
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => setCollapsed(readCollapsed()), []);

  function toggle(title: string) {
    setCollapsed((prev) => {
      const next = prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title];
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(next));
      } catch {
        /* private mode: just don't remember */
      }
      return next;
    });
  }

  return (
    <nav aria-label="תפריט ניהול" className="space-y-3 px-2">
      {ADMIN_NAV.map((group, gi) => {
        const hasActive = group.items.some((i) => i.href === active);
        // The group holding the current screen always stays open.
        const open = !group.title || hasActive || !collapsed.includes(group.title);
        const listId = `admin-nav-group-${gi}`;
        return (
          <div key={group.title ?? gi}>
            {group.title && (
              <button
                type="button"
                onClick={() => toggle(group.title!)}
                aria-expanded={open}
                aria-controls={listId}
                disabled={hasActive}
                className="mb-1 flex w-full items-center justify-between rounded-md px-2.5 py-1 text-[11px] font-semibold text-[var(--color-text-muted)] hover:bg-white/70 hover:text-[var(--color-text)] disabled:cursor-default disabled:hover:bg-transparent"
              >
                {group.title}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "" : "rotate-90"}`} aria-hidden />
              </button>
            )}
            <div className={`grid transition-[grid-template-rows] duration-200 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
              <ul id={listId} className="space-y-0.5 overflow-hidden" inert={!open}>
                {group.items.map((item) => {
                  const Icon = ICONS[item.href];
                  const isActive = item.href === active;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={isActive ? "page" : undefined}
                        className={`relative flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] transition-colors ${
                          isActive
                            ? "bg-white font-semibold text-[var(--color-text)] shadow-sm before:absolute before:inset-y-2 before:start-0 before:w-[3px] before:rounded-full before:bg-[var(--color-primary)]"
                            : "text-[var(--color-text-muted)] hover:bg-white/70 hover:text-[var(--color-text)]"
                        }`}
                      >
                        {Icon && <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-[var(--color-primary)]" : ""}`} aria-hidden />}
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function SignedInAs({ email }: { email: string }) {
  const router = useRouter();
  return (
    <div className="border-t border-[var(--color-border)] px-4 py-3">
      <p className="truncate text-xs text-[var(--color-text-muted)]" title={email}>
        {email}
      </p>
      <button
        type="button"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/login");
          router.refresh();
        }}
        className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--color-text)] hover:text-[var(--color-primary)]"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        התנתקות
      </button>
    </div>
  );
}

interface AdminShellProps {
  email: string;
  children: React.ReactNode;
}

/**
 * Admin frame: a quiet sidebar (logo, grouped menu, who is signed in) and the
 * content beside it. On phones the menu moves into a drawer behind a top bar.
 */
export function AdminShell({ email, children }: AdminShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]" dir="rtl">
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-s border-[var(--color-border)] bg-[var(--color-bg-muted)] md:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-4 pb-5 pt-5" aria-label="ניהול פזצט״א, דף הבית">
          <Logo alt="Paza" className="h-7 w-auto object-contain" width={84} height={24} />
          <span className="text-sm font-semibold text-[var(--color-text-muted)]">ניהול</span>
        </Link>
        <div className="flex-1 overflow-y-auto pb-6">
          <AdminNav pathname={pathname} />
        </div>
        <SignedInAs email={email} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-white px-4 md:hidden">
          <Link href="/admin" className="flex items-center gap-2" aria-label="ניהול פזצט״א, דף הבית">
            <Logo alt="Paza" className="h-7 w-auto object-contain" width={88} height={26} />
            <span className="text-sm font-semibold text-[var(--color-text-muted)]">ניהול</span>
          </Link>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
            aria-label="פתיחת התפריט"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>
        <main className="w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>

      <NavDrawer open={drawerOpen} onClose={closeDrawer} title="תפריט ניהול">
        <div className="flex h-full flex-col bg-[var(--color-bg-muted)] pt-4">
          <div className="flex-1">
            <AdminNav pathname={pathname} onNavigate={closeDrawer} />
          </div>
          <SignedInAs email={email} />
        </div>
      </NavDrawer>
    </div>
  );
}
