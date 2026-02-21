"use client";

import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function AppShell({ children, title, className }: AppShellProps) {
  return (
    <div className={cn("flex min-h-screen bg-background", className)} dir="rtl">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <TopBar title={title} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
