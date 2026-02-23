"use client";

import { useState, useEffect } from "react";
import { apiJson } from "@/lib/api";

type PendingLesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  teacher: { id: string; email: string; name: string | null };
  student: { id: string; email: string; name: string | null };
};

export function PendingLessonsBlock() {
  const [lessons, setLessons] = useState<PendingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  function fetchPending() {
    setLoading(true);
    apiJson<PendingLesson[]>("/api/admin/pending-lessons")
      .then((r) => {
        if (r.ok) setLessons(r.data);
        else setLessons([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPending();
  }, []);

  function handleApprove(id: string) {
    setApprovingId(id);
    apiJson<{ ok?: boolean }>(`/api/lessons/${id}/approve`, { method: "POST" })
      .then((r) => {
        if (r.ok) fetchPending();
      })
      .finally(() => setApprovingId(null));
  }

  if (loading) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-sm" dir="rtl">
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">שיעורים שמחכים לאישור</h2>
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      </section>
    );
  }
  if (lessons.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-sm" dir="rtl">
      <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">שיעורים שמחכים לאישור</h2>
      <ul className="space-y-3">
        {lessons.map((l) => (
          <li
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-input)] border border-[var(--color-border)] p-3"
          >
            <span className="text-[var(--color-text)]">
              {l.teacher.name || l.teacher.email} ↔ {l.student.name || l.student.email} — {l.date} {l.startTime}–{l.endTime}
            </span>
            <button
              type="button"
              disabled={!!approvingId}
              onClick={() => handleApprove(l.id)}
              className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {approvingId === l.id ? "מאשר…" : "אשר"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
