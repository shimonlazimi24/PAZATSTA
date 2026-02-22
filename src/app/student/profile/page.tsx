"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BackLink } from "@/components/design/BackLink";

export default function StudentProfilePage() {
  const router = useRouter();
  const [studentFullName, setStudentFullName] = useState("");
  const [parentFullName, setParentFullName] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/student/profile")
      .then((r) => (r.ok ? r.json() : {}))
      .then((p) => {
        setStudentFullName(p.studentFullName ?? "");
        setParentFullName(p.parentFullName ?? "");
        setParentPhone(p.parentPhone ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentFullName: studentFullName.trim(),
          parentFullName: parentFullName.trim(),
          parentPhone: parentPhone.trim(),
        }),
      });
      if (!res.ok) {
        setError("שגיאה בשמירה");
        setSaving(false);
        return;
      }
      router.push("/student/topics");
    } catch {
      setError("שגיאת רשת");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <AppShell title="פרטי תלמיד">
        <p className="text-[var(--color-text-muted)]">טוען…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="פרטי תלמיד">
      <div className="max-w-xl mx-auto space-y-6" dir="rtl">
        <BackLink href="/book" label="חזרה" />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="studentFullName" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              שם מלא תלמיד
            </label>
            <input
              id="studentFullName"
              type="text"
              value={studentFullName}
              onChange={(e) => setStudentFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)]"
            />
          </div>
          <div>
            <label htmlFor="parentFullName" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              שם מלא של אחד ההורים
            </label>
            <input
              id="parentFullName"
              type="text"
              value={parentFullName}
              onChange={(e) => setParentFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)]"
            />
          </div>
          <div>
            <label htmlFor="parentPhone" className="block text-sm font-medium text-[var(--color-text)] mb-1">
              טלפון של אחד ההורים
            </label>
            <input
              id="parentPhone"
              type="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              required
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)]"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "שומר…" : "שמור והמשך"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
