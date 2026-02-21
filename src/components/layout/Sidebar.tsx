"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { LayoutDashboard, Calendar, Settings, LogOut, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const TEACHER_NAV: NavItem[] = [
  { href: "/teacher/dashboard", label: "לוח מורה", icon: LayoutDashboard },
];
const STUDENT_NAV: NavItem[] = [
  { href: "/student", label: "השיעורים שלי", icon: Calendar },
  { href: "/student/book", label: "קביעת שיעור", icon: BookOpen },
];
const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "ניהול", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          setNavItems([]);
          return;
        }
        const { role, canAccessAdmin } = data;
        const items: NavItem[] = [];
        if (role === "teacher") items.push(...TEACHER_NAV);
        else if (role === "student") items.push(...STUDENT_NAV);
        if (role === "admin" || canAccessAdmin) items.push(...ADMIN_NAV);
        setNavItems(items.length ? items : [...STUDENT_NAV]);
      })
      .catch(() => setNavItems([]));
  }, []);

  return (
    <aside className="hidden w-64 shrink-0 border-s border-border bg-card md:block">
      <div className="sticky top-0 flex h-screen flex-col p-4">
        <Link href="/welcome" className="mb-8 flex items-center gap-2 px-2">
          <Logo alt="Paza" className="h-7 w-auto object-contain" width={100} height={28} />
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
            התנתק
          </button>
        </div>
      </div>
    </aside>
  );
}
