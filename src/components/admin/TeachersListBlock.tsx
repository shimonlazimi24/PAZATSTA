"use client";

import { useState, useEffect } from "react";
import { apiJson } from "@/lib/api";

type Teacher = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
};

export function TeachersListBlock() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function fetchTeachers() {
    setLoading(true);
    apiJson<Teacher[]>("/api/admin/teachers")
      .then((r) => {
        if (r.ok) setTeachers(r.data);
        else setTeachers([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchTeachers();
  }, []);

  function handleDelete(t: Teacher) {
    const label = t.name || t.email;
    if (!confirm(`למחוק את המורה ${label}? פעולה זו תמחק גם את כל השיעורים והזמינות שלו.`)) return;
    setDeletingId(t.id);
    apiJson<{ ok?: boolean }>(`/api/admin/teachers/${t.id}`, { method: "DELETE" })
      .then((r) => {
        if (r.ok) fetchTeachers();
        else alert(r.error || "שגיאה במחיקה");
      })
      .finally(() => setDeletingId(null));
  }

  if (loading) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-sm" dir="rtl">
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      </section>
    );
  }

  if (teachers.length === 0) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-sm" dir="rtl">
        <p className="text-sm text-[var(--color-text-muted)]">אין מורים במערכת.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-sm" dir="rtl">
      <ul className="space-y-3">
        {teachers.map((t) => (
          <li
            key={t.id}
            className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 rounded-[var(--radius-input)] border border-[var(--color-border)] p-3"
          >
            <div className="flex-1 min-w-0">
              <span className="font-medium text-[var(--color-text)] block">
                {t.name || t.email}
              </span>
              <span className="text-sm text-[var(--color-text-muted)] block">
                {t.email}
                {t.phone ? ` · ${t.phone}` : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleDelete(t)}
              disabled={!!deletingId}
              className="shrink-0 px-3 py-2 rounded-[var(--radius-input)] border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              {deletingId === t.id ? "מוחק…" : "מחק"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
