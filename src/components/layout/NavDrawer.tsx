"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Optional title shown in drawer header */
  title?: string;
}

/**
 * Drawer that slides in from the right (RTL: right edge of screen).
 * Positioned with right: 0; closed = translateX(100%); open = translateX(0).
 */
export function NavDrawer({ open, onClose, children, title }: NavDrawerProps) {
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    } else {
      document.body.style.overflow = "";
      return undefined;
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!open) return null;

  return (
    <>
      {/* Overlay - backdrop click closes */}
      <div
        role="presentation"
        aria-hidden
        className="fixed inset-0 z-50 bg-black/30 md:hidden"
        onClick={onClose}
      />
      {/* Panel - right: 0, slides in from right with transition */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "תפריט ניווט"}
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-[min(85vw,20rem)] flex flex-col bg-[var(--color-bg)] border-s border-[var(--color-border)] shadow-[var(--shadow-card)] md:hidden",
          "animate-[drawer-slide-in_0.2s_ease-out]"
        )}
        dir="rtl"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
          {title && (
            <span className="text-lg font-semibold text-[var(--color-text)]">{title}</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-[var(--radius-input)] text-[var(--color-text-muted)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text)]"
            aria-label="סגור תפריט"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </aside>
    </>
  );
}
