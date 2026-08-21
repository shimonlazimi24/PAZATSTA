"use client";

import { useEffect } from "react";

/**
 * Shared error boundary UI.
 *
 * Stack traces and raw error messages are shown only in development. In production
 * they tell the user nothing useful and can disclose internals, so the user gets a
 * plain explanation, a retry, and the digest to quote in a support request.
 */
export function ErrorState({
  error,
  reset,
  title = "משהו השתבש",
  homeHref = "/",
  homeLabel = "חזרה לדף הבית",
  scope,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  homeHref?: string;
  homeLabel?: string;
  scope: string;
}) {
  useEffect(() => {
    console.error(`[${scope}]`, error);
  }, [error, scope]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-bg)]"
      dir="rtl"
    >
      <div className="max-w-lg w-full space-y-4" role="alert">
        <h1 className="text-xl font-bold text-[var(--color-text)]">{title}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {isDev
            ? error.message
            : "לא הצלחנו לטעון את הדף. נסו שוב — ואם זה חוזר, פנו אלינו."}
        </p>

        {isDev && error.stack && (
          <pre className="text-xs text-[var(--color-text-muted)] overflow-auto max-h-48 p-4 bg-[var(--color-bg-muted)] rounded-[var(--radius-input)] whitespace-pre-wrap break-words">
            {error.stack}
          </pre>
        )}

        {error.digest && (
          <p className="text-xs text-[var(--color-text-muted)]">
            קוד תקלה: <span className="font-mono">{error.digest}</span>
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            נסה שוב
          </button>
          <a
            href={homeHref}
            className="px-4 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium hover:bg-[var(--color-bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            {homeLabel}
          </a>
        </div>
      </div>
    </div>
  );
}
