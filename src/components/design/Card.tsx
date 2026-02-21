"use client";

import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-hover)] border border-[var(--color-border)]",
        className
      )}
    >
      {children}
    </div>
  );
}
