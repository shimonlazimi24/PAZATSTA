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

  if (loading) return null;
  if (lessons.length === 0 && !rejectedMessage) return null;

  const dateLabel = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <section aria-labelledby="pending-h" dir="rtl">
      <h2 id="pending-h" className="mb-3 text-lg font-semibold text-[var(--color-text)]">
        מחכים לאישור שלך
        {lessons.length > 0 && <span className="ms-2 text-sm font-normal text-[var(--color-text-muted)]">{lessons.length}</span>}
      </h2>
      {rejectedMessage && (
        <p role="status" className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {rejectedMessage}
        </p>
      )}
      <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {lessons.map((l) => (
          <li key={l.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              <span className="block font-medium text-[var(--color-text)]">
                {dateLabel(l.date)}, <span className="tabular-nums">{l.startTime}–{l.endTime}</span>
              </span>
              <span className="block text-sm text-[var(--color-text-muted)]">{l.student.name || l.student.email}</span>
            </span>
            <span className="flex items-center gap-4">
              <button
                type="button"
                disabled={!!approvingId || !!rejectingId}
                onClick={() => handleApprove(l.id)}
                className="min-h-[44px] rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {approvingId === l.id ? "מאשר…" : "אישור"}
              </button>
              <button
                type="button"
                disabled={!!approvingId || !!rejectingId}
                onClick={() => {
                  if (confirm("לא לאשר את הבקשה? השיעור יבוטל והתלמיד יוכל לבחור מועד אחר.")) handleReject(l.id);
                }}
                className="min-h-[44px] rounded-md border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] disabled:opacity-50"
              >
                {rejectingId === l.id ? "מבטל…" : "לא לאשר"}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
