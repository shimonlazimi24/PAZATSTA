"use client";

import { useState } from "react";

export function SendHoursSummaryButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleClick() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/send-hours-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "שגיאה");
        return;
      }
      setMessage(data.message || "הסיכום נשלח לאימייל שלך.");
    } catch {
      setMessage("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2" dir="rtl">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "שולח…" : "שלח סיכום שעות למייל"}
      </button>
      {message && (
        <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
      )}
    </div>
  );
}
