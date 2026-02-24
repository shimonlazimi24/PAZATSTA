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
    const getJson = async (r: Response) => {
      if (!r.ok) return [];
      try {
        return await r.json();
      } catch {
        return [];
      }
    };
    Promise.all([
      fetch("/api/student/lessons?upcoming=true", { credentials: "include" }).then(getJson),
      fetch("/api/student/lessons?past=true", { credentials: "include" }).then(getJson),
    ])
      .then(([u, p]) => {
        setUpcoming(Array.isArray(u) ? u : []);
        setPast(Array.isArray(p) ? p : []);
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
    <AppShell title="השיעורים שלי">
      <div className="space-y-8">
        <div className="flex justify-end">
          <Link
            href="/student/book"
            className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            קבע שיעור נוסף
          </Link>
        </div>

        <section>
          <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
            שיעורים שיהיו
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              אין שיעורים קרובים. קבע שיעור בלחיצה על &quot;קבע שיעור נוסף&quot;.
            </p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((l) => {
                const teacherLabel = l.teacher.name || l.teacher.email;
                return (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-4 py-3"
                  >
                    <div>
                      <p className="text-xs text-[var(--color-text-muted)]">מורה</p>
                      <p className="font-medium text-[var(--color-text)]">
                        {teacherLabel}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {formatDate(l.date)} {l.startTime}–{l.endTime}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--color-primary)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                      מתוזמן
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
            שיעורים שהיו
          </h2>
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
          ) : past.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">אין שיעורים בעבר</p>
          ) : (
            <ul className="space-y-2">
              {past.map((l) => (
                <li
                  key={l.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-4 py-3"
                >
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">מורה</p>
                    <p className="font-medium text-[var(--color-text)]">
                      {l.teacher.name || l.teacher.email}
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {formatDate(l.date)} {l.startTime}–{l.endTime}
                    </p>
                  </div>
                  {l.summary?.pdfUrl && (
                    <a
                      href={l.summary.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[var(--color-primary)] hover:underline"
                    >
                      צפייה ב-PDF
                    </a>
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
