"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "שליחת הקוד נכשלה");
        return;
      }
      router.push(`/verify?email=${encodeURIComponent(trimmed)}&role=admin`);
    } catch {
      setStatus("error");
      setMessage("שגיאת רשת");
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 bg-[var(--color-bg)]"
      dir="rtl"
    >
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo alt="Paza" className="h-10 w-auto" width={140} height={48} />
        </div>
        <h1 className="text-2xl font-bold text-center text-[var(--color-text)]">
          כניסת מנהל
        </h1>
        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label
              htmlFor="admin-login-email"
              className="block text-sm font-medium text-[var(--color-text)] mb-1"
            >
              אימייל
            </label>
            <input
              id="admin-login-email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
              disabled={status === "loading"}
            />
          </div>
          {message && <p className="text-sm text-red-600">{message}</p>}
          <div className="flex gap-2">
            <Link
              href="/login"
              className="px-4 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] text-[var(--color-text)] text-center"
            >
              חזרה
            </Link>
            <button
              type="submit"
              disabled={status === "loading"}
              className="flex-1 py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {status === "loading" ? "שולח…" : "שלח קוד"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
