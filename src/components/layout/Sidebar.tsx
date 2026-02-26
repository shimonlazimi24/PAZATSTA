"use client";

import { useNavItems } from "@/hooks/useNavItems";
import { SidebarNavContent } from "./SidebarNavContent";
import type { NavItem } from "./SidebarNavContent";

interface SidebarProps {
  navItems?: NavItem[];
}

/**
 * Desktop-only sidebar. On mobile, use NavDrawer via AppShell.
 */
export function Sidebar({ navItems: propNavItems }: SidebarProps = {}) {
  const fetchedItems = useNavItems();
  const navItems = propNavItems && propNavItems.length > 0 ? propNavItems : fetchedItems;

  return (
    <aside className="hidden w-64 shrink-0 border-s border-border bg-card md:block" dir="rtl">
      <div className="sticky top-0 flex h-screen flex-col p-4">
        <SidebarNavContent navItems={navItems} useDesignTokens={false} />
      </div>
    </aside>
  );
}
