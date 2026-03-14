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
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectedMessage, setRejectedMessage] = useState<string | null>(null);

  function fetchPending(silent = false) {
    if (!silent) setLoading(true);
    apiJson<PendingLesson[]>("/api/admin/pending-lessons")
      .then((r) => {
        if (r.ok) setLessons(r.data);
        else setLessons([]);
      })
      .finally(() => { if (!silent) setLoading(false); });
  }

  useEffect(() => {
    fetchPending();
    const interval = setInterval(() => fetchPending(true), 30_000);
    const onFocus = () => fetchPending(true);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  function handleApprove(id: string) {
    setApprovingId(id);
    apiJson<{ ok?: boolean }>(`/api/lessons/${id}/approve`, { method: "POST" })
      .then((r) => {
        if (r.ok) fetchPending();
      })
      .finally(() => setApprovingId(null));
  }

  function handleReject(id: string) {
    setRejectingId(id);
    setRejectedMessage(null);
    apiJson<{ ok?: boolean }>(`/api/lessons/${id}/reject`, { method: "POST" })
      .then((r) => {
        if (r.ok) {
          setRejectedMessage("השיעור לא אושר");
          setTimeout(() => setRejectedMessage(null), 4000);
          fetchPending();
        }
      })
      .finally(() => setRejectingId(null));
  }

  if (loading) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-sm" dir="rtl">
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">שיעורים בהמתנה לאישור</h2>
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      </section>
    );
  }
  if (lessons.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-sm" dir="rtl">
      <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">שיעורים בהמתנה לאישור</h2>
      {rejectedMessage && (
        <p className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-[var(--radius-input)] px-3 py-2 text-right">
          {rejectedMessage}
        </p>
      )}
      <ul className="space-y-3">
        {lessons.map((l) => (
          <li
            key={l.id}
            className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-2 rounded-[var(--radius-input)] border border-[var(--color-border)] p-3"
          >
            <span className="text-[var(--color-text)] text-sm sm:text-base min-w-0">
              {l.teacher.name || l.teacher.email} ↔ {l.student.name || l.student.email} — {l.date} {l.startTime}–{l.endTime}
            </span>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                type="button"
                disabled={!!approvingId || !!rejectingId}
                onClick={() => handleApprove(l.id)}
                className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-3 py-2 min-h-[44px] text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {approvingId === l.id ? "מאשר…" : "אשר"}
              </button>
              <button
                type="button"
                disabled={!!approvingId || !!rejectingId}
                onClick={() => handleReject(l.id)}
                className="rounded-[var(--radius-input)] border border-amber-500 bg-amber-50 px-3 py-2 min-h-[44px] text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {rejectingId === l.id ? "דוחה…" : "לא לאשר"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
