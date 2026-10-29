"use client";

import { useCallback, useEffect, useState } from "react";
import { addDaysYYYYMMDD, isLessonStarted } from "@/lib/dates";

type WeeklyLesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending_approval" | "scheduled" | "completed" | string;
  topic: string | null;
  isWorkshop: boolean;
  teacher: { id: string; email: string; name: string | null };
  student: { id: string; email: string; name: string | null };
};

const todayIL = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

/** Sunday of the week containing dateStr, computed on calendar dates (no local-clock drift). */
function sundayOf(dateStr: string): string {
  const weekday = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return addDaysYYYYMMDD(dateStr, -weekday);
}

const dayHeading = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const rangeLabel = (start: string) => {
  const a = new Date(`${start}T12:00:00Z`);
  const b = new Date(`${addDaysYYYYMMDD(start, 6)}T12:00:00Z`);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  const opts = { day: "numeric", month: "long", timeZone: "UTC" } as const;
  return sameMonth
    ? `${a.getUTCDate()}–${b.toLocaleDateString("he-IL", opts)}`
    : `${a.toLocaleDateString("he-IL", opts)} – ${b.toLocaleDateString("he-IL", opts)}`;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending_approval: { label: "ממתין לאישור", cls: "bg-amber-50 text-amber-800" },
  scheduled: { label: "מאושר", cls: "bg-[var(--color-bg-muted)] text-[var(--color-text)]" },
  completed: { label: "הושלם", cls: "bg-green-50 text-green-800" },
};

const actionBtn = "text-sm text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline disabled:opacity-50";

export function AdminWeeklyCalendar() {
  const [weekStart, setWeekStart] = useState(() => sundayOf(todayIL()));
  const [lessons, setLessons] = useState<WeeklyLesson[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (start: string) => {
    const end = addDaysYYYYMMDD(start, 6);
    try {
      const r = await fetch(`/api/admin/weekly-lessons?start=${start}&end=${end}`, { cache: "no-store", credentials: "include" });
      setLessons(r.ok ? await r.json() : []);
    } catch {
      setLessons([]);
    }
  }, []);

  useEffect(() => {
    setLessons(null);
    load(weekStart);
  }, [weekStart, load]);

  async function act(lesson: WeeklyLesson, action: "cancel" | "reject" | "not-held") {
    const prompts = {
      cancel: "לבטל את השיעור? התלמיד והמורה יקבלו מייל, והמשבצת תחזור לזמינות.",
      reject: "לא לאשר את הבקשה? השיעור יבוטל והמשבצת תחזור לזמינות.",
      "not-held": "השיעור לא התקיים? הוא יוצא מסיכום השעות. הדוח שנשלח נשמר.",
    };
    if (!confirm(prompts[action])) return;
    setBusyId(lesson.id);
    setMessage(null);
    try {
      const r = await fetch(`/api/lessons/${lesson.id}/${action}`, { method: "POST", credentials: "include" });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setMessage({ ok: false, text: data.error ?? "הפעולה לא הצליחה. נסו שוב." });
      else {
        setMessage({ ok: true, text: action === "reject" ? "הבקשה נדחתה." : action === "cancel" ? "השיעור בוטל." : "השיעור הוצא מסיכום השעות." });
        load(weekStart);
      }
    } catch {
      setMessage({ ok: false, text: "אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב." });
    } finally {
      setBusyId(null);
    }
  }

  const today = todayIL();
  const days = Array.from({ length: 7 }, (_, i) => addDaysYYYYMMDD(weekStart, i));
  const isThisWeek = weekStart === sundayOf(today);
  const counts = {
    total: lessons?.length ?? 0,
    pending: lessons?.filter((l) => l.status === "pending_approval").length ?? 0,
  };
  const navBtn = "min-h-[36px] rounded-md border border-[var(--color-border)] bg-white px-3 text-sm hover:bg-[var(--color-bg-muted)]";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text)]">{rangeLabel(weekStart)}</p>
          {lessons && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {counts.total === 0 ? "אין שיעורים" : counts.total === 1 ? "שיעור אחד" : `${counts.total} שיעורים`}
              {counts.pending > 0 && `, ${counts.pending} ממתינים לאישור`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className={navBtn} onClick={() => setWeekStart(addDaysYYYYMMDD(weekStart, -7))}>
            השבוע הקודם
          </button>
          {!isThisWeek && (
            <button type="button" className={navBtn} onClick={() => setWeekStart(sundayOf(today))}>
              השבוע
            </button>
          )}
          <button type="button" className={navBtn} onClick={() => setWeekStart(addDaysYYYYMMDD(weekStart, 7))}>
            השבוע הבא
          </button>
        </div>
      </div>

      {message && (
        <p className={`rounded-md px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}

      {!lessons ? (
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      ) : (
        <ol className="space-y-4">
          {days.map((d) => {
            const dayLessons = lessons.filter((l) => l.date === d);
            const isToday = d === today;
            return (
              <li key={d} className={d < today ? "opacity-75" : ""}>
                <h3 className={`mb-1.5 text-sm font-semibold ${isToday ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"}`}>
                  {dayHeading(d)}
                  {isToday && " (היום)"}
                </h3>
                {dayLessons.length === 0 ? (
                  <p className="border-b border-[var(--color-border)] pb-3 text-sm text-[var(--color-text-muted)]">אין שיעורים</p>
                ) : (
                  <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-white">
                    {dayLessons.map((l) => {
                      const status = STATUS[l.status] ?? { label: l.status, cls: "bg-[var(--color-bg-muted)]" };
                      const busy = busyId === l.id;
                      return (
                        <li key={l.id} className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[5.5rem_1fr_auto] sm:items-center">
                          <span className="text-sm font-medium tabular-nums text-[var(--color-text)]">
                            {l.startTime}–{l.endTime}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-[var(--color-text)]">
                              {l.student.name || l.student.email}
                              <span className="text-[var(--color-text-muted)]"> עם {l.teacher.name || l.teacher.email}</span>
                            </span>
                            {(l.topic || l.isWorkshop) && (
                              <span className="block truncate text-xs text-[var(--color-text-muted)]">{l.isWorkshop ? "סדנה" : l.topic}</span>
                            )}
                          </span>
                          <span className="flex flex-wrap items-center gap-3">
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${status.cls}`}>{status.label}</span>
                            {l.status === "pending_approval" && (
                              <button type="button" disabled={busy} className={actionBtn} onClick={() => act(l, "reject")}>
                                לא לאשר
                              </button>
                            )}
                            {l.status === "scheduled" && !isLessonStarted(l.date, l.startTime) && (
                              <button type="button" disabled={busy} className={actionBtn} onClick={() => act(l, "cancel")}>
                                ביטול
                              </button>
                            )}
                            {/* Once the time has passed, "canceled" (email, slot freed) no longer fits; "not held" does. */}
                            {(l.status === "completed" || (l.status === "scheduled" && isLessonStarted(l.date, l.startTime))) && (
                              <button type="button" disabled={busy} className={actionBtn} onClick={() => act(l, "not-held")}>
                                לא התקיים
                              </button>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
