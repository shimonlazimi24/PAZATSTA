"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar } from "./Calendar";
import { LessonList } from "./LessonList";
import { ScheduleLessonForm } from "./ScheduleLessonForm";

type Lesson = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  notes: string | null;
  student: { email: string; name: string | null };
};

function buildEventsByDate(lessons: Lesson[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of lessons) {
    const d = l.startsAt.slice(0, 10);
    out[d] = (out[d] ?? 0) + 1;
  }
  return out;
}

export function TeacherLessons() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [upcoming, setUpcoming] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMonth = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(
        `/api/teacher/lessons?month=${month}&year=${year}`
      ).then((r) => (r.ok ? r.json() : [])),
      fetch("/api/teacher/lessons").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([monthLessons, upcomingLessons]) => {
        setLessons(monthLessons);
        setUpcoming(upcomingLessons);
      })
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const eventsByDate = buildEventsByDate(lessons);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Calendar
            eventsByDate={eventsByDate}
            initialYear={year}
            initialMonth={month}
            onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
          />
        </div>
        <div>
          <ScheduleLessonForm onScheduled={loadMonth} />
        </div>
      </div>
      <section className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-3">Upcoming lessons</h2>
        {loading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : (
          <LessonList lessons={upcoming} showWho="student" emptyMessage="No upcoming lessons. Schedule one above." />
        )}
      </section>
    </div>
  );
}
