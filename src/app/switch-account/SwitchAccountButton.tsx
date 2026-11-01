"use client";

import { useState } from "react";

/** Logs out, then opens the right login screen with the original page as the destination. */
export function SwitchAccountButton({ to, label }: { to: string; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => null);
        window.location.href = to;
      }}
      className="min-h-[44px] w-full rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 font-medium text-white hover:opacity-90 disabled:opacity-60"
    >
      {busy ? "מתנתק…" : label}
    </button>
  );
}
