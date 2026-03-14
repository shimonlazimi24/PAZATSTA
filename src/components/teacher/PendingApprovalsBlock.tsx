"use client";

import { useState, useEffect } from "react";
import { apiJson } from "@/lib/api";

type PendingLesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  student: { id: string; email: string; name: string | null };
};

export function PendingApprovalsBlock() {
  const [lessons, setLessons] = useState<PendingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectedMessage, setRejectedMessage] = useState<string | null>(null);

  function fetchPending() {
    setLoading(true);
    apiJson<PendingLesson[]>("/api/teacher/lessons?pending=true")
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
    apiJson<{ ok?: boolean }>(`/api/lessons/${id}/approve`, { method: "POST", credentials: "include" })
      .then((r) => {
        if (r.ok) {
          fetchPending();
          setTimeout(() => {
            window.dispatchEvent(new Event("teacher-lessons-refresh"));
          }, 150);
        }
      })
      .finally(() => setApprovingId(null));
  }

  function handleReject(id: string) {
    setRejectingId(id);
    setRejectedMessage(null);
    apiJson<{ ok?: boolean }>(`/api/lessons/${id}/reject`, { method: "POST", credentials: "include" })
      .then((r) => {
        if (r.ok) {
          setRejectedMessage("השיעור לא אושר");
          setTimeout(() => setRejectedMessage(null), 4000);
          fetchPending();
          setTimeout(() => {
            window.dispatchEvent(new Event("teacher-lessons-refresh"));
          }, 150);
        }
      })
      .finally(() => setRejectingId(null));
  }

  if (loading) {
    return (
      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]" dir="rtl">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">שיעורים בהמתנה לאישור</h2>
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]" dir="rtl">
      <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">שיעורים בהמתנה לאישור</h2>
      {rejectedMessage && (
        <p className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-[var(--radius-input)] px-3 py-2 text-right">
          {rejectedMessage}
        </p>
      )}
      {lessons.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">אין שיעורים בהמתנה. שיעורים שאושרו מופיעים בשיעורים הקרובים למטה.</p>
      ) : (
      <ul className="space-y-3">
        {lessons.map((l) => (
          <li
            key={l.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-input)] border border-[var(--color-border)] p-3"
          >
            <span className="text-[var(--color-text)]">
              {l.student.name || l.student.email} — {l.date} {l.startTime}–{l.endTime}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!!approvingId || !!rejectingId}
                onClick={() => handleApprove(l.id)}
                className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {approvingId === l.id ? "מאשר…" : "אשר"}
              </button>
              <button
                type="button"
                disabled={!!approvingId || !!rejectingId}
                onClick={() => handleReject(l.id)}
                className="rounded-[var(--radius-input)] border border-amber-500 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                {rejectingId === l.id ? "דוחה…" : "לא לאשר"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      )}
    </section>
  );
}
