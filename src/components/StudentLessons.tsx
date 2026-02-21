"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar } from "./Calendar";
import { LessonList } from "./LessonList";

type Lesson = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  notes: string | null;
  teacher: { email: string; name: string | null };
};

function buildEventsByDate(lessons: Lesson[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lessons) {
    const d = l.startsAt.slice(0, 10);
    out[d] = (out[d] ?? 0) + 1;
  }
  return out;
}

export function StudentLessons() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [upcoming, setUpcoming] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(
        `/api/student/lessons?month=${month}&year=${year}`
      ).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/student/lessons").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([monthLessons, upcomingLessons]) => {
        setLessons(monthLessons);
        setUpcoming(upcomingLessons);
      })
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const eventsByDate = buildEventsByDate(lessons);

  return (
    <div className="space-y-6">
      <section className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <Calendar
          eventsByDate={eventsByDate}
          initialYear={year}
          initialMonth={month}
          onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
        />
      </section>
      <section className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3">My upcoming lessons</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <LessonList
            lessons={upcoming}
            showWho="teacher"
            emptyMessage="No upcoming lessons. Your teacher will schedule them."
          />
        )}
      </section>
    </div>
  );
}
