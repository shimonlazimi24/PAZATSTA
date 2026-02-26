"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { CalendarPlus } from "lucide-react";

type Lesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  teacher: { id: string; email: string; name: string | null };
  summary: { pdfUrl: string | null } | null;
};

function formatLessonDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function StudentDashboardContent() {
  const [upcoming, setUpcoming] = useState<Lesson[]>([]);
  const [past, setPast] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchLessons() {
    setLoading(true);
    fetch("/api/student/lessons?upcoming=true&past=true", {
      credentials: "include",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    })
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

  if (loading) {
    return (
      <AppShell title="השיעורים שלי">
        <div className="max-w-2xl mx-auto space-y-8 py-2" dir="rtl">
          <header className="text-center sm:text-right pb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
              דף הבית — השיעורים שלי
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)] text-base max-w-xl">
              השיעורים הקרובים והשיעורים שעברו. לשיעורים שעברו — לחצו &quot;צפייה ב-PDF&quot; כדי לצפות בסיכום השיעור.
            </p>
          </header>
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-card)] text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" aria-hidden />
            <p className="mt-3 text-[var(--color-text-muted)]">טוען…</p>
          </div>
        </div>
      </AppShell>
    );
  }

  const hasUpcoming = upcoming.length > 0;
  const hasPast = past.length > 0;

  return (
    <AppShell title="השיעורים שלי">
      <div className="max-w-2xl mx-auto space-y-8 py-2" dir="rtl">
        <header className="text-center sm:text-right pb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
            דף הבית — השיעורים שלי
          </h1>
          <p className="mt-2 text-[var(--color-text-muted)] text-base max-w-xl">
            השיעורים הקרובים והשיעורים שעברו. לשיעורים שעברו — לחצו &quot;צפייה ב-PDF&quot; כדי לצפות בסיכום השיעור.
          </p>
        </header>

        <section id="student-lessons" className="space-y-8">
          {hasUpcoming && (
            <section>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">
                השיעורים הקרובים
              </h3>
              <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white overflow-hidden shadow-[var(--shadow-card)]">
                {upcoming.map((l) => {
                  const teacherLabel = l.teacher.name || l.teacher.email;
                  return (
                    <li key={l.id} className="p-4 hover:bg-[var(--color-bg-muted)]/50 transition-colors">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-[var(--color-text)]">
                            {formatLessonDate(l.date)} {l.startTime}–{l.endTime}
                          </p>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {teacherLabel}
                          </p>
                        </div>
                        <span className="rounded-full bg-[var(--color-primary)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                          מתוזמן
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {hasPast && (
            <section>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">
                שיעורים שעברו
              </h3>
              <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white overflow-hidden shadow-[var(--shadow-card)]">
                {past.map((l) => {
                  const hasSummary = !!l.summary;
                  const teacherLabel = l.teacher.name || l.teacher.email;
                  return (
                    <li key={l.id} className="p-4 hover:bg-[var(--color-bg-muted)]/50 transition-colors">
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <p className="font-medium text-[var(--color-text)]">
                            {formatLessonDate(l.date)} {l.startTime}–{l.endTime}
                          </p>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {teacherLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {hasSummary ? (
                            <>
                              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                סיכום זמין
                              </span>
                              <a
                                href={l.summary?.pdfUrl ?? `/api/pdf/lesson-summaries/lesson-${l.id}.pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-[var(--color-primary)] hover:underline"
                              >
                                צפייה ב-PDF
                              </a>
                            </>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                              ממתין לסיכום
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {!hasUpcoming && !hasPast && (
            <p className="text-[var(--color-text-muted)] py-4">
              אין שיעורים כרגע. קבע שיעור בלחיצה על &quot;קבע שיעור נוסף&quot; למטה.
            </p>
          )}
        </section>

        <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
          <Link
            href="/student/book"
            className="flex items-center justify-center gap-3 w-full rounded-[var(--radius-input)] bg-[var(--color-primary)] px-5 py-3.5 text-base font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            <CalendarPlus className="w-5 h-5 shrink-0" aria-hidden />
            קבע שיעור נוסף
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
