"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export type ToastType = "success" | "error" | "default";

interface ToastProps {
  message: string;
  type?: ToastType;
  open: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  message,
  type = "default",
  open,
  onClose,
  duration = 4000,
}: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        onClose();
      }, duration);
      return () => clearTimeout(t);
    }
  }, [open, duration, onClose]);

  if (!open) return null;
  return (
    <div
      role="alert"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 shadow-soft-lg transition-opacity",
        type === "success" && "border-emerald-200 bg-emerald-50 text-emerald-800",
        type === "error" && "border-red-200 bg-red-50 text-red-800",
        type === "default" && "border-border bg-card text-foreground"
      )}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          onClose();
        }}
        className="shrink-0 rounded-lg p-1 hover:bg-black/5"
        aria-label="סגור"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
