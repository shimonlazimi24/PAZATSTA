"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

type Lesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  teacher: { id: string; email: string; name: string | null };
  summary: { pdfUrl: string | null } | null;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function StudentDashboardContent() {
  const [upcoming, setUpcoming] = useState<Lesson[]>([]);
  const [past, setPast] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchLessons() {
    setLoading(true);
    fetch("/api/student/lessons?upcoming=true&past=true", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { upcoming: [], past: [] }))
      .then((data) => {
        setUpcoming(Array.isArray(data.upcoming) ? data.upcoming : []);
        setPast(Array.isArray(data.past) ? data.past : []);
      })
      .catch(() => {
        setUpcoming([]);
        setPast([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchLessons();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchLessons();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Link
            href="/student/book"
            className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            קבע שיעור נוסף
          </Link>
        </div>

        <section>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            שיעורים שיהיו
          </h3>
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              אין שיעורים קרובים. קבע שיעור בלחיצה על &quot;קבע שיעור נוסף&quot;.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white overflow-hidden">
              {upcoming.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div>
                    <p className="font-medium text-[var(--color-text)] text-sm">
                      {formatDate(l.date)} {l.startTime}–{l.endTime}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {l.teacher.name || l.teacher.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--color-primary)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                    מתוזמן
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            שיעורים שהיו
          </h3>
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
          ) : past.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">אין שיעורים בעבר</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white overflow-hidden">
              {past.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div>
                    <p className="font-medium text-[var(--color-text)] text-sm">
                      {formatDate(l.date)} {l.startTime}–{l.endTime}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {l.teacher.name || l.teacher.email}
                    </p>
                  </div>
                  {l.summary ? (
                    <a
                      href={l.summary.pdfUrl ?? `/api/pdf/lesson-summaries/lesson-${l.id}.pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[var(--color-primary)] hover:underline shrink-0"
                    >
                      צפייה ב-PDF
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--color-text-muted)]">חסר דוח</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
