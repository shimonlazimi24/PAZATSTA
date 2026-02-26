"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Calendar, Settings, LogOut, BookOpen, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export const TEACHER_NAV: NavItem[] = [
  { href: "/teacher/dashboard", label: "לוח מורה", icon: LayoutDashboard },
  { href: "/teacher/availability", label: "הגדרת זמינות", icon: Calendar },
  { href: "/teacher/profile", label: "פרטיים אישיים", icon: User },
];
export const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "השיעורים שלי", icon: Calendar },
  { href: "/book", label: "קביעת שיעור", icon: BookOpen },
];
export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "ניהול", icon: Settings },
];

interface SidebarNavContentProps {
  navItems: NavItem[];
  /** Called when user navigates (e.g. to close drawer) */
  onNavigate?: () => void;
  /** Use design tokens for consistency with rest of app */
  useDesignTokens?: boolean;
}

export function SidebarNavContent({
  navItems,
  onNavigate,
  useDesignTokens = false,
}: SidebarNavContentProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.replace("/login");
    router.refresh();
    onNavigate?.();
  }

  const linkCls = useDesignTokens
    ? (active: boolean) =>
        cn(
          "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
          active
            ? "bg-[var(--color-primary)] text-white"
            : "text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
        )
    : (active: boolean) =>
        cn(
          "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px]",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        );

  const logoutCls = useDesignTokens
    ? "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)] min-h-[44px]"
    : "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground min-h-[44px]";

  return (
    <>
      <div className="mb-6 flex items-center gap-2 px-2 md:mb-8">
        <Logo alt="Paza" className="h-7 w-auto object-contain" width={100} height={28} />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={linkCls(active)}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[var(--color-border)] pt-4">
        <button
          type="button"
          onClick={handleLogout}
          className={logoutCls}
        >
          <LogOut className="h-5 w-5" />
          התנתק
        </button>
      </div>
    </>
  );
}
