"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { DateSelector } from "@/components/design/DateSelector";
import { cn } from "@/lib/utils";
import { formatIsraelYYYYMMDD, addDaysYYYYMMDD } from "@/lib/dates";
import { apiJson } from "@/lib/api";

type ApiSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
};

const SLOT_DURATION = 60; // minutes
const START_HOUR = 8;
const END_HOUR = 22; // 20:00–22:00 included for evening slots

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Israel-safe: 2 weeks of dates (YYYY-MM-DD). Avoids UTC shift from toISOString().slice(0,10). */
function getWeekDatesIsrael(): string[] {
  const startStr = formatIsraelYYYYMMDD(new Date());
  const out: string[] = [startStr];
  for (let i = 1; i < 14; i++) out.push(addDaysYYYYMMDD(startStr, i));
  return out;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00.000Z");
  return d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "short" });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00.000Z");
  return d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", weekday: "short" });
}

function generateTimeOptionsForDay(): { id: string; startTime: string; endTime: string }[] {
  const options: { id: string; startTime: string; endTime: string; available: boolean }[] = [];
  let idx = 0;
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION) {
      const start = minutesToTime(h * 60 + m);
      const endMin = h * 60 + m + SLOT_DURATION;
      const end = minutesToTime(endMin);
      if (endMin <= END_HOUR * 60) {
        options.push({
          id: `opt-${idx++}`,
          startTime: start,
          endTime: end,
          available: true,
        });
      }
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptionsForDay();

type TeacherAvailabilityProps = {
  weekDates?: string[];
  onSlotsChange?: (slots: ApiSlot[]) => void;
  /** When set, uses admin API to edit another teacher's availability. */
  teacherId?: string;
};

type BookedLesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  student: { name: string | null; email: string };
};

const getApiBase = (teacherId?: string) =>
  teacherId ? `/api/admin/teachers/${teacherId}/availability` : "/api/teacher/availability";

export function TeacherAvailability({ weekDates: weekDatesProp, onSlotsChange, teacherId }: TeacherAvailabilityProps = {}) {
  const apiBase = getApiBase(teacherId);
  const weekDates = useMemo(() => weekDatesProp ?? getWeekDatesIsrael(), [weekDatesProp]);
  const dateOptions = weekDates.map((date) => ({
    date,
    label: formatDateLabel(date),
    weekday: formatWeekday(date),
  }));

  const [selectedDate, setSelectedDate] = useState<string | null>(weekDates[0]);
  const [slots, setSlots] = useState<ApiSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [fullDayLoading, setFullDayLoading] = useState(false);
  // Booking deletes the Availability row, so a booked slot leaves no trace in the
  // availability data this editor loads. Without the lessons it renders an occupied
  // slot as an empty one, and clicking it adds availability on top of a real lesson.
  const [booked, setBooked] = useState<BookedLesson[]>([]);

  const load = useCallback(() => {
    if (!selectedDate || weekDates.length === 0) return;
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    setLoading(true);
    setLoadError(null);
    apiJson<ApiSlot[]>(`${apiBase}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then((r) => {
        if (r.ok) {
          setSlots(r.data);
          onSlotsChange?.(r.data);
        } else {
          setLoadError(r.error);
          setSlots([]);
        }
      })
      .finally(() => setLoading(false));
  }, [selectedDate, weekDates, onSlotsChange, apiBase]);

  useEffect(() => {
    if (weekDates.length === 0) return;
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    setLoading(true);
    setLoadError(null);
    apiJson<ApiSlot[]>(`${apiBase}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then((r) => {
        if (r.ok) {
          setSlots(r.data);
          onSlotsChange?.(r.data);
        } else {
          setLoadError(r.error);
          setSlots([]);
        }
      })
      .finally(() => setLoading(false));
  }, [weekDates, apiBase, onSlotsChange]);

  const loadBooked = useCallback(() => {
    // Admin mode only: the teacher-facing route has no equivalent endpoint, and
    // leaving `booked` empty keeps that path behaving exactly as before.
    if (!teacherId || weekDates.length === 0) return;
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    apiJson<BookedLesson[]>(
      `/api/admin/weekly-lessons?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    ).then((r) => {
      if (r.ok) {
        setBooked(
          (r.data as (BookedLesson & { teacher?: { id: string } })[]).filter(
            (l) => l.teacher?.id === teacherId
          )
        );
      }
    });
  }, [teacherId, weekDates]);

  useEffect(() => {
    loadBooked();
  }, [loadBooked]);

  const existingForDate = selectedDate
    ? slots.filter((s) => s.date === selectedDate)
    : [];
  const slotOptions = TIME_OPTIONS.map((opt) => {
    const existing = existingForDate.find(
      (s) => s.startTime === opt.startTime && s.endTime === opt.endTime
    );
    return {
      id: existing?.id ?? opt.id,
      startTime: opt.startTime,
      endTime: opt.endTime,
      available: true,
      date: selectedDate ?? "",
      isAdded: !!existing,
      booked: booked.find(
        (l) => l.date === selectedDate && l.startTime === opt.startTime
      ),
    };
  });

  const allSlotsAdded = selectedDate && slotOptions.every((o) => o.isAdded);

  async function toggleFullDay() {
    if (!selectedDate || fullDayLoading || toggling) return;

    if (allSlotsAdded) {
      setFullDayLoading(true);
      try {
        const res = await fetch(
          `${apiBase}?date=${encodeURIComponent(selectedDate)}`,
          { method: "DELETE", credentials: "include" }
        );
        if (res.ok) {
          setSlots((prev) => {
            const next = prev.filter((s) => s.date !== selectedDate);
            onSlotsChange?.(next);
            return next;
          });
        } else {
          setLoadError("שגיאה בהסרת המשבצות. נסו שוב.");
        }
      } catch {
        setLoadError("שגיאה בהסרת המשבצות. נסו שוב.");
      } finally {
        setFullDayLoading(false);
        load();
      }
      return;
    }

    setFullDayLoading(true);
    // Never publish availability on top of a slot a lesson already holds.
    const toAdd = slotOptions.filter((o) => !o.isAdded && !o.booked);
    const slotsPayload = toAdd.map((o) => ({
      date: selectedDate,
      startTime: o.startTime,
      endTime: o.endTime,
    }));
    const res = await fetch(teacherId ? `${apiBase}` : "/api/teacher/availability/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ slots: slotsPayload }),
    });
    if (!res.ok) {
      setLoadError("שגיאה בשמירת המשבצות. נסו שוב.");
    }
    setFullDayLoading(false);
    load();
  }

  /**
   * Free a slot that already has a lesson on it.
   *
   * Removing the availability row would do nothing here — booking deleted it. The
   * slot is held by the lesson, so freeing it means ending the lesson: reject while
   * it is still awaiting approval, cancel once it is scheduled. Both restore the
   * slot to availability and notify the student.
   */
  async function removeBookedSlot(lesson: BookedLesson) {
    // A completed lesson has already happened; cancel would reject it with a 400
    // after the confirm had promised otherwise. Say so instead of asking.
    if (lesson.status === "completed") {
      setLoadError(
        `המשבצת ${lesson.startTime}–${lesson.endTime} שייכת לשיעור שכבר הושלם ולכן לא ניתן לפנות אותה.`
      );
      return;
    }
    const action = lesson.status === "pending_approval" ? "reject" : "cancel";
    const verb = action === "reject" ? "לדחות את הבקשה" : "לבטל את השיעור";
    const who = lesson.student.name || lesson.student.email;
    if (
      !window.confirm(
        `המשבצת ${lesson.startTime}–${lesson.endTime} תפוסה על ידי ${who}.\n\n` +
          `כדי לפנות אותה צריך ${verb}. התלמיד וההורה יקבלו הודעה על כך.\n\nלהמשיך?`
      )
    ) {
      return;
    }
    setToggling(lesson.id);
    setLoadError(null);
    const res = await apiJson(`/api/lessons/${lesson.id}/${action}`, {
      method: "POST",
    });
    if (!res.ok) {
      setLoadError(res.error);
    }
    setToggling(null);
    load();
    loadBooked();
  }

  async function toggleSlot(opt: (typeof slotOptions)[0]) {
    if (opt.booked) {
      await removeBookedSlot(opt.booked);
      return;
    }
    if (!selectedDate || toggling) return;
    const isRemoving = opt.isAdded && opt.id && !opt.id.startsWith("opt-") && !opt.id.startsWith("pending-");

    if (isRemoving) {
      setToggling(opt.id);
      setLoadError(null);
      const res = await fetch(`${apiBase}?id=${encodeURIComponent(opt.id)}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setSlots((prev) => {
          const next = prev.filter((s) => s.id !== opt.id);
          onSlotsChange?.(next);
          return next;
        });
      } else {
        load();
        setLoadError("שגיאה בהסרת המשבצת. נסו שוב.");
      }
      setToggling(null);
      return;
    }

    const pendingId = `pending-${opt.startTime}-${opt.endTime}`;
    const newSlot: ApiSlot = {
      id: pendingId,
      date: selectedDate,
      startTime: opt.startTime,
      endTime: opt.endTime,
    };
    setToggling(opt.id);
    setSlots((prev) => [...prev, newSlot]);
    onSlotsChange?.([...slots, newSlot]);

    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(
        teacherId
          ? { slots: [{ date: selectedDate, startTime: opt.startTime, endTime: opt.endTime }] }
          : { date: selectedDate, startTime: opt.startTime, endTime: opt.endTime }
      ),
    });
    if (!res.ok) {
      setSlots((prev) => prev.filter((s) => s.id !== pendingId));
      onSlotsChange?.(slots);
      setLoadError("שגיאה בשמירת המשבצת. נסו שוב.");
      setToggling(null);
      return;
    }
    if (teacherId) {
      load();
      setToggling(null);
      return;
    }
    try {
      const created = await res.json();
      if (created?.id) {
        setSlots((prev) => {
          const next = prev.map((s) =>
            s.id === pendingId ? { ...s, id: created.id } : s
          );
          onSlotsChange?.(next);
          return next;
        });
      }
    } catch {
      setSlots((prev) => prev.filter((s) => s.id !== pendingId));
      onSlotsChange?.(slots);
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-[var(--radius-input)] px-3 py-2 text-right">
          {loadError}
        </p>
      )}
      <p className="text-sm text-[var(--color-text-muted)] text-right">
        בחרו תאריך ואז סמנו את משבצות השעה שבהן אתם פנויים. לחיצה מוסיפה/מסירה.
      </p>
      <div>
        <p className="text-[var(--color-text-muted)] text-right mb-2">בחרו תאריך</p>
        <DateSelector
          options={dateOptions}
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
        />
      </div>
      {selectedDate && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2 mt-6">
            <p className="text-[var(--color-text-muted)] text-right">בחרו שעות פנויות</p>
            <button
              type="button"
              disabled={loading || fullDayLoading}
              onClick={toggleFullDay}
              className={cn(
                "rounded-[var(--radius-input)] border px-3 py-1.5 text-sm font-medium transition-colors",
                allSlotsAdded
                  ? "border-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100"
                  : "border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20",
                (loading || fullDayLoading) && "opacity-50 cursor-not-allowed"
              )}
            >
              {fullDayLoading ? "מעבד…" : allSlotsAdded ? "הסר כל היום" : "פנוי כל היום"}
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {slotOptions.map((opt) => {
                const isSelected = opt.isAdded;
                const isBooked = !!opt.booked;
                const busy = toggling === opt.id || toggling === opt.booked?.id;
                return (
                  <button
                    key={`${selectedDate}-${opt.startTime}-${opt.endTime}`}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleSlot(opt)}
                    title={
                      isBooked
                        ? `תפוס: ${opt.booked!.student.name || opt.booked!.student.email}`
                        : undefined
                    }
                    className={cn(
                      "rounded-[var(--radius-input)] border px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
                      isBooked && "border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100",
                      !isBooked && isSelected &&
                        "border-[var(--color-primary)] bg-[var(--color-primary)] text-white",
                      !isBooked && !isSelected &&
                        "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)]",
                      busy && "opacity-50 cursor-wait"
                    )}
                  >
                    {opt.startTime}–{opt.endTime}
                    {isBooked && <span className="mr-1 text-xs">תפוס</span>}
                    {!isBooked && isSelected && (
                      <span className="mr-1 text-xs opacity-90">פנוי</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
