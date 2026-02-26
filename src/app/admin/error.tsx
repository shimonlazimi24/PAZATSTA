"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin/error]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-bg)]" dir="rtl">
      <div className="max-w-lg w-full space-y-4">
        <h1 className="text-xl font-bold text-[var(--color-text)]">שגיאה בדף הניהול</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{error.message}</p>
        {error.stack && (
          <pre className="text-xs text-[var(--color-text-muted)] overflow-auto max-h-48 p-4 bg-[var(--color-bg-muted)] rounded-[var(--radius-input)] whitespace-pre-wrap break-words">
            {error.stack}
          </pre>
        )}
        {error.digest && (
          <p className="text-xs text-[var(--color-text-muted)]">Digest: {error.digest}</p>
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90"
          >
            נסה שוב
          </button>
          <a
            href="/admin"
            className="px-4 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium hover:bg-[var(--color-bg-muted)]"
          >
            חזרה לניהול
          </a>
        </div>
      </div>
    </div>
  );
}
