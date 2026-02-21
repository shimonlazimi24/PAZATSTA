"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

function ArrowLeft() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  showArrow?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", showArrow = false, children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2 disabled:opacity-50",
          variant === "primary" &&
            "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-card",
          variant === "secondary" &&
            "bg-[var(--color-bg-muted)] text-[var(--color-text)] hover:bg-[var(--color-border)]",
          variant === "ghost" && "text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]",
          className
        )}
        {...props}
      >
        {children}
        {showArrow && <ArrowLeft />}
      </button>
    );
  }
);
Button.displayName = "Button";
