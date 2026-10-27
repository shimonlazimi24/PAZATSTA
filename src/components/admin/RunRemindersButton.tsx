"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/api";

/** Runs the reminder job on demand (it also runs by itself every 15 minutes). */
export function RunRemindersButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setState("running");
    setMessage(null);
    const r = await apiJson<{ sent: number; failed: number }>("/api/admin/approval-reminders/run", { method: "POST" });
    setState("idle");
    if (!r.ok) {
      setMessage("ההרצה נכשלה. נסו שוב בעוד דקה.");
      return;
    }
    setMessage(
      r.data.sent === 0 && r.data.failed === 0
        ? "אין כרגע תזכורות שמגיע זמנן."
        : `נשלחו ${r.data.sent} תזכורות${r.data.failed ? `, ${r.data.failed} נכשלו וינוסו שוב` : ""}.`
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={run}
        disabled={state === "running"}
        className="inline-flex min-h-[40px] items-center rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] disabled:opacity-50"
      >
        {state === "running" ? "שולח…" : "שליחת תזכורות שהגיע זמנן"}
      </button>
      {message && <p className="text-xs text-[var(--color-text-muted)]">{message}</p>}
    </div>
  );
}
