"use client";

import { useState } from "react";

export function DefineTeacherForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/define-teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "שגיאה");
        return;
      }
      setStatus("success");
      setMessage("המורה נשמר בהצלחה");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("שגיאת רשת");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" dir="rtl">
      <div>
        <label htmlFor="teacher-email" className="block text-sm font-medium text-[var(--color-text)] mb-1">
          אימייל מורה
        </label>
        <input
          id="teacher-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teacher@example.com"
          required
          className="w-full max-w-md px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)]"
          disabled={status === "loading"}
        />
      </div>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {status === "loading" ? "שומר…" : "שמור"}
      </button>
    </form>
  );
}
