"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { NavDrawer } from "./NavDrawer";
import { SidebarNavContent } from "./SidebarNavContent";
import { useNavItems } from "@/hooks/useNavItems";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function AppShell({ children, title, className }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navItems = useNavItems();
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className={cn("flex min-h-screen bg-background", className)} dir="rtl">
      <Sidebar navItems={navItems} />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar title={title} onMenuClick={openDrawer} />
        <main className="flex-1 w-full max-w-screen-lg mx-auto px-4 py-4 sm:px-6 sm:py-6 md:p-8">
          {children}
        </main>
      </div>
      <NavDrawer open={drawerOpen} onClose={closeDrawer} title="תפריט">
        <div className="flex flex-col p-4 min-h-full">
          <SidebarNavContent navItems={navItems} onNavigate={closeDrawer} useDesignTokens />
        </div>
      </NavDrawer>
    </div>
  );
}
