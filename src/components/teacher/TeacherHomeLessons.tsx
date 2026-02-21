"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { addToCalendar } from "@/lib/calendar";

type Lesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  questionFromStudent: string | null;
  student: { id: string; email: string; name: string | null };
  summary: { pdfUrl: string | null } | null;
};

const MOCK_UPCOMING: Lesson[] = [
  {
    id: "mock-up-1",
    date: "2025-03-02",
    startTime: "10:00",
    endTime: "10:45",
    status: "scheduled",
    questionFromStudent: "אשמח להתמקד בחשיבה כמותית והכנה למא״ה.",
    student: { id: "s1", email: "student@example.com", name: "דני כהן" },
    summary: null,
  },
  {
    id: "mock-up-2",
    date: "2025-03-05",
    startTime: "14:00",
    endTime: "14:45",
    status: "scheduled",
    questionFromStudent: null,
    student: { id: "s2", email: "lea@example.com", name: "ליאה לוי" },
    summary: null,
  },
];

const MOCK_PAST: Lesson[] = [
  {
    id: "mock-past-1",
    date: "2025-02-15",
    startTime: "09:00",
    endTime: "09:45",
    status: "completed",
    questionFromStudent: null,
    student: { id: "s3", email: "yosi@example.com", name: "יוסי מזרחי" },
    summary: { pdfUrl: "#" },
  },
  {
    id: "mock-past-2",
    date: "2025-02-18",
    startTime: "11:00",
    endTime: "11:45",
    status: "completed",
    questionFromStudent: null,
    student: { id: "s4", email: "maya@example.com", name: "מאי גולן" },
    summary: null,
  },
];

function formatLessonDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function TeacherHomeLessons() {
  const searchParams = useSearchParams();
  const useMock = searchParams.get("mock") === "lessons";

  const [upcoming, setUpcoming] = useState<Lesson[]>([]);
  const [past, setPast] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    if (useMock) {
      setLoading(true);
      setTimeout(() => {
        setUpcoming(MOCK_UPCOMING);
        setPast(MOCK_PAST);
        setLoading(false);
      }, 400);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch("/api/teacher/lessons?upcoming=true").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/teacher/lessons?past=true").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([u, p]) => {
        setUpcoming(u);
        setPast(p);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [useMock]);

  if (loading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-card)] text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" aria-hidden />
        <p className="mt-3 text-[var(--color-text-muted)]">טוען…</p>
      </div>
    );
  }

  const hasUpcoming = upcoming.length > 0;
  const hasPast = past.length > 0;
  if (!hasUpcoming && !hasPast) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 sm:p-10 shadow-[var(--shadow-card)] text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-highlight)] text-[var(--color-primary)]">
          <CalendarDays className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[var(--color-text)]">
          אין שיעורים כרגע
        </h3>
        <p className="mt-2 max-w-sm mx-auto text-[var(--color-text-muted)]">
          השיעורים הקרובים והעבר יופיעו כאן אחרי שתגדירו זמינות ותלמידים יבחרו מועדים.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      {useMock && (
        <p className="text-center text-sm text-[var(--color-text-muted)] rounded-[var(--radius-input)] bg-[var(--color-highlight)]/50 py-2 px-3">
          תצוגת דמו — נתוני שיעורים לדוגמה
        </p>
      )}
      {hasUpcoming && (
        <section>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            השיעורים הקרובים
          </h3>
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white overflow-hidden shadow-[var(--shadow-card)]">
            {upcoming.map((l) => {
              const studentLabel = l.student.name || l.student.email;
              const calendarTitle = `שיעור פאזה – ${studentLabel}`;
              return (
                <li key={l.id} className="p-4 hover:bg-[var(--color-bg-muted)]/50 transition-colors">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-text)]">
                        {formatLessonDate(l.date)} {l.startTime}–{l.endTime}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {studentLabel}
                      </p>
                      {l.questionFromStudent && (
                        <p className="text-sm text-[var(--color-text)] mt-1">
                          שאלה: {l.questionFromStudent}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          addToCalendar({
                            date: l.date,
                            startTime: l.startTime,
                            endTime: l.endTime,
                            title: calendarTitle,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                      >
                        <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                        הוסף ללוח השנה
                      </button>
                      <span className="rounded-full bg-[var(--color-primary)]/15 px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]">
                        מתוזמן
                      </span>
                    </div>
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
              const hasReport = !!l.summary;
              return (
                <li key={l.id} className="p-4 hover:bg-[var(--color-bg-muted)]/50 transition-colors">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-text)]">
                        {formatLessonDate(l.date)} {l.startTime}–{l.endTime}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {l.student.name || l.student.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasReport ? (
                        <>
                          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            דוח הושלם
                          </span>
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
                        </>
                      ) : (
                        <>
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            חסר דוח
                          </span>
                          <Link
                            href={l.id.startsWith("mock-") ? "/teacher/lesson/demo/report" : `/teacher/lesson/${l.id}/report`}
                            className="px-3 py-1.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90"
                          >
                            מלא דוח שיעור
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
