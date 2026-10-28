"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { NavDrawer } from "./NavDrawer";
import type { NavItem } from "./SidebarNavContent";
import { useNavItems } from "@/hooks/useNavItems";

interface AppShellProps {
  children: React.ReactNode;
  /** Shown in the phone top bar; pages carry their own heading. */
  title?: string;
  className?: string;
}

function Nav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5 px-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                active
                  ? "bg-white font-semibold text-[var(--color-text)] shadow-sm before:absolute before:inset-y-2 before:start-0 before:w-[3px] before:rounded-full before:bg-[var(--color-primary)]"
                  : "text-[var(--color-text-muted)] hover:bg-white/70 hover:text-[var(--color-text)]"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active && "text-[var(--color-primary)]")} aria-hidden />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Footer({ email }: { email?: string }) {
  const router = useRouter();
  return (
    <div className="border-t border-[var(--color-border)] px-4 py-3">
      {email && (
        <p className="truncate text-xs text-[var(--color-text-muted)]" title={email}>
          {email}
        </p>
      )}
      <button
        type="button"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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

/** Frame for teacher and student pages; same layout as the admin frame. */
export function AppShell({ children, title, className }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navItems = useNavItems();
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const items = [...navItems];

  return (
    <div className={cn("flex min-h-screen bg-[var(--color-bg)]", className)} dir="rtl">
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-s border-[var(--color-border)] bg-[var(--color-bg-muted)] md:flex">
        <Link href="/" className="block px-4 pb-5 pt-5" aria-label="פזצט״א, דף הבית">
          <Logo alt="Paza" className="h-7 w-auto object-contain" width={84} height={24} />
        </Link>
        <nav aria-label="תפריט ראשי" className="flex-1 overflow-y-auto pb-6">
          <Nav items={items} />
        </nav>
        <Footer email={navItems.email} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-white px-4 md:hidden">
          <span className="flex min-w-0 items-center gap-3">
            <Logo alt="Paza" className="h-7 w-auto object-contain" width={84} height={24} />
            {title && <span className="truncate text-sm font-semibold text-[var(--color-text)]">{title}</span>}
          </span>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
            aria-label="פתיחת התפריט"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>
        <main className="w-full max-w-4xl flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>

      <NavDrawer open={drawerOpen} onClose={closeDrawer} title="תפריט">
        <div className="flex h-full flex-col bg-[var(--color-bg-muted)] pt-4">
          <div className="flex-1">
            <Nav items={items} onNavigate={closeDrawer} />
          </div>
          <Footer email={navItems.email} />
        </div>
      </NavDrawer>
    </div>
  );
}
