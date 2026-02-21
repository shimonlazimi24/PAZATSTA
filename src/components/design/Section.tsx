"use client";

import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  muted?: boolean;
}

export function Section({ children, id, className, muted }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "w-full py-16 md:py-24",
        muted && "bg-[var(--color-bg-muted)]",
        className
      )}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
