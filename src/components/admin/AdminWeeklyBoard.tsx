"use client";

import { useState, useEffect } from "react";

type WeeklyLesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  reportCompleted?: boolean;
  teacher: { id: string; email: string; name: string | null };
  student: { id: string; email: string; name: string | null };
};

function getWeekRange(ref: Date): { start: string; end: string } {
  const d = new Date(ref);
  const day = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  const start = sunday.toISOString().slice(0, 10);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  const end = saturday.toISOString().slice(0, 10);
  return { start, end };
}

export function AdminWeeklyBoard() {
  const [weekStart, setWeekStart] = useState(() => getWeekRange(new Date()));
  const [lessons, setLessons] = useState<WeeklyLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/weekly-lessons?start=${weekStart.start}&end=${weekStart.end}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
  }, [weekStart.start, weekStart.end]);

  const goPrev = () => {
    const d = new Date(weekStart.start + "T12:00:00");
    d.setDate(d.getDate() - 7);
    setWeekStart(getWeekRange(d));
  };
  const goNext = () => {
    const d = new Date(weekStart.start + "T12:00:00");
    d.setDate(d.getDate() + 7);
    setWeekStart(getWeekRange(d));
  };

  const byDate = lessons.reduce(
    (acc, l) => {
      if (!acc[l.date]) acc[l.date] = [];
      acc[l.date].push(l);
      return acc;
    },
    {} as Record<string, WeeklyLesson[]>
  );
  const dates = Object.keys(byDate).sort();

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-sm" dir="rtl">
      <h2 className="text-xl font-bold text-[var(--color-text)] mb-3">לוח שבועי</h2>
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={goPrev}
          className="rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg-muted)]"
        >
          ← שבוע קודם
        </button>
        <span className="text-sm font-medium text-[var(--color-text)]">
          {weekStart.start} – {weekStart.end}
        </span>
        <button
          type="button"
          onClick={goNext}
          className="rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-bg-muted)]"
        >
          שבוע הבא →
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      ) : dates.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">אין שיעורים בשבוע זה.</p>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">{date}</h3>
              <ul className="space-y-2">
                {byDate[date]
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center gap-2 rounded-[var(--radius-input)] border border-[var(--color-border)] p-2 text-sm"
                    >
                      <span className="font-medium text-[var(--color-text)]">
                        {l.startTime}–{l.endTime}
                      </span>
                      <span className="text-[var(--color-text-muted)]">
                        {l.teacher.name || l.teacher.email} ↔ {l.student.name || l.student.email}
                      </span>
                      <span
                        className={
                          l.status === "pending_approval"
                            ? "text-amber-600"
                            : l.status === "completed"
                              ? "text-green-600"
                              : "text-[var(--color-text-muted)]"
                        }
                      >
                        {l.status === "pending_approval"
                          ? "ממתין לאישור"
                          : l.status === "completed"
                            ? (l.reportCompleted ? "הושלם + דוח" : "הושלם")
                            : "מתוזמן"}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
