"use client";

import { useState, useEffect, useMemo } from "react";

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

const DAY_NAMES_HE = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const SLOT_MINUTES = 30;
const START_HOUR = 8;
const END_HOUR = 21;

function getWeekRange(ref: Date): { start: string; end: string; dates: string[] } {
  const d = new Date(ref);
  const day = d.getDay();
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);
  const start = sunday.toISOString().slice(0, 10);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(sunday);
    x.setDate(sunday.getDate() + i);
    dates.push(x.toISOString().slice(0, 10));
  }
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  const end = saturday.toISOString().slice(0, 10);
  return { start, end, dates };
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "short" });
}

export function AdminWeeklyCalendar() {
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

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      for (let m = 0; m < 60; m += SLOT_MINUTES) {
        slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      }
    }
    return slots;
  }, []);


  if (loading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white overflow-hidden shadow-sm" dir="rtl">
      <div className="flex items-center justify-between gap-4 p-4 border-b border-[var(--color-border)]">
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

      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[700px]">
          <thead>
            <tr>
              <th className="w-16 p-2 text-xs font-medium text-[var(--color-text-muted)] border-b border-r border-[var(--color-border)] bg-[var(--color-bg-muted)]">
                שעה
              </th>
              {weekStart.dates.map((date, i) => (
                <th
                  key={date}
                  className="min-w-[100px] p-2 text-xs font-medium text-[var(--color-text)] border-b border-r last:border-r-0 border-[var(--color-border)] bg-[var(--color-bg-muted)]"
                >
                  <div>{DAY_NAMES_HE[i]}</div>
                  <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5">
                    {formatDateShort(date)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slotTime) => (
              <tr key={slotTime}>
                <td className="p-1 text-xs text-[var(--color-text-muted)] border-b border-r border-[var(--color-border)] align-top bg-[var(--color-bg-muted)]/50">
                  {slotTime}
                </td>
                {weekStart.dates.map((date) => {
                  const slotMin = parseTime(slotTime);
                  const matchingLessons = lessons.filter((l) => {
                    if (l.date !== date) return false;
                    const startMin = parseTime(l.startTime);
                    const endMin = parseTime(l.endTime);
                    return slotMin >= startMin && slotMin < endMin;
                  });
                  const topLesson = matchingLessons[0];
                  const isFirstSlot =
                    topLesson &&
                    parseTime(topLesson.startTime) === slotMin;

                  return (
                    <td
                      key={date}
                      className="p-1 align-top border-b border-r last:border-r-0 border-[var(--color-border)] min-h-[36px]"
                    >
                      {isFirstSlot && topLesson && (
                        <div
                          className="rounded-[var(--radius-input)] p-2 text-xs border border-[var(--color-border)] bg-white shadow-sm"
                          style={{
                            minHeight: Math.max(
                              36,
                              ((parseTime(topLesson.endTime) - parseTime(topLesson.startTime)) /
                                SLOT_MINUTES) *
                                36
                            ),
                          }}
                        >
                          <div className="font-medium text-[var(--color-text)]">
                            {topLesson.startTime}–{topLesson.endTime}
                          </div>
                          <div className="text-[var(--color-text-muted)] mt-0.5 truncate">
                            {topLesson.teacher.name || topLesson.teacher.email} ↔{" "}
                            {topLesson.student.name || topLesson.student.email}
                          </div>
                          <span
                            className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] ${
                              topLesson.status === "pending_approval"
                                ? "bg-amber-100 text-amber-800"
                                : topLesson.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                            }`}
                          >
                            {topLesson.status === "pending_approval"
                              ? "ממתין"
                              : topLesson.status === "completed"
                                ? "הושלם"
                                : "מתוזמן"}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lessons.length === 0 && (
        <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
          אין שיעורים בשבוע זה.
        </p>
      )}
    </div>
  );
}
