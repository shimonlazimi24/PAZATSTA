"use client";

import { useState } from "react";
import { Card } from "@/components/design/Card";
import { Button } from "@/components/design/Button";
import { FormField } from "@/components/design/FormField";

const ROLES = [
  { value: "teacher", label: "מורה" },
  { value: "parent", label: "הורה" },
  { value: "student", label: "תלמיד" },
  { value: "admin", label: "מנהל" },
] as const;

export function InviteForm() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"teacher" | "parent" | "student" | "admin">(
    "teacher"
  );
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "יצירת ההזמנה נכשלה");
        return;
      }
      setStatus("success");
      setMessage(`ההזמנה נשלחה ל־${email.trim()}`);
      setEmail("");
      window.dispatchEvent(new CustomEvent("invite-created"));
    } catch {
      setStatus("error");
      setMessage("שגיאת רשת");
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <FormField
          label="אימייל"
          name="invite-email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="user@example.com"
          required
        />
        <div className="text-right">
          <label htmlFor="invite-role" className="block text-sm font-medium text-[var(--color-text)] mb-1">
            תפקיד
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as typeof role)}
            className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 py-3 text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            disabled={status === "loading"}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        {message && (
          <p
            className={`text-sm ${
              status === "success" ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
        <Button
          type="submit"
          disabled={status === "loading"}
          showArrow
        >
          {status === "loading" ? "יוצר…" : "צור הזמנה"}
        </Button>
      </form>
    </Card>
  );
}
