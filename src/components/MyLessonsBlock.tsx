"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/design/Card";
import { Button } from "@/components/design/Button";
import { CalendarDays } from "lucide-react";

type Lesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  teacher: { name: string | null; email: string };
  student?: { name: string | null; email: string; phone: string | null };
  summary?: { pdfUrl: string | null } | null;
};

function displayLabel(l: Lesson): string {
  return l.teacher?.name || l.teacher?.email || "—";
}

function formatLessonDate(dateStr: string, startTime: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return (
    d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" }) +
    " " +
    startTime
  );
}

export function MyLessonsBlock() {
  const [upcoming, setUpcoming] = useState<Lesson[]>([]);
  const [past, setPast] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  function load() {
    Promise.all([
      fetch("/api/student/lessons?upcoming=true", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/student/lessons?past=true", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([u, p]) => {
        if (Array.isArray(u)) {
          setAllowed(true);
          setUpcoming(u.slice().sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)));
        }
        if (Array.isArray(p)) {
          setAllowed(true);
          setPast(p.slice().sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)));
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  if (!allowed && !loading) return null;
  if (loading) {
    return (
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-[var(--color-text)] text-right mb-2">השיעורים שלי</h2>
        <p className="text-sm text-[var(--color-text-muted)] text-right">טוען…</p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold text-[var(--color-text)] text-right mb-1">השיעורים שלי</h2>
      <p className="text-sm text-[var(--color-text-muted)] text-right mb-4">הבאים ועבר</p>

      <h3 className="text-sm font-medium text-[var(--color-text-muted)] text-right mb-2">הבאים</h3>
      {upcoming.length === 0 ? (
        <Card className="rounded-2xl border border-border p-6 mb-6">
          <div className="flex flex-col items-center justify-center text-center text-[var(--color-text-muted)]">
            <CalendarDays className="h-10 w-10 mb-2 opacity-60" />
            <p className="font-medium text-[var(--color-text)]">אין שיעורים קרובים</p>
            <p className="text-sm">קבע שיעור בתהליך למטה</p>
          </div>
        </Card>
      ) : (
        <ul className="space-y-2 mb-6">
          {upcoming.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-soft"
            >
              <div className="text-right">
                <p className="font-medium text-[var(--color-text)]">
                  מורה: {displayLabel(l)}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {formatLessonDate(l.date, l.startTime)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h3 className="text-sm font-medium text-[var(--color-text-muted)] text-right mb-2">עבר</h3>
      {past.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-right">אין שיעורים בעבר</p>
      ) : (
        <ul className="space-y-2">
          {past.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded-2xl border border-[var(--color-border)] bg-white px-4 py-3 shadow-soft"
            >
              <div className="text-right">
                <p className="font-medium text-[var(--color-text)]">
                  מורה: {displayLabel(l)}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {formatLessonDate(l.date, l.startTime)}
                </p>
              </div>
              {l.summary?.pdfUrl && (
                <a
                  href={l.summary.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0"
                >
                  <Button variant="secondary" className="text-sm py-2 px-4">
                    הורד סיכום
                  </Button>
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
