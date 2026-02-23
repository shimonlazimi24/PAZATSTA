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
const END_HOUR = 20;

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/** Israel-safe week dates (YYYY-MM-DD). Avoids UTC shift from toISOString().slice(0,10). */
function getWeekDatesIsrael(): string[] {
  const startStr = formatIsraelYYYYMMDD(new Date());
  const out: string[] = [startStr];
  for (let i = 1; i < 7; i++) out.push(addDaysYYYYMMDD(startStr, i));
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
};

export function TeacherAvailability({ weekDates: weekDatesProp, onSlotsChange }: TeacherAvailabilityProps = {}) {
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

  const load = useCallback(() => {
    if (!selectedDate || weekDates.length === 0) return;
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    setLoading(true);
    setLoadError(null);
    apiJson<ApiSlot[]>(`/api/teacher/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
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
  }, [selectedDate, weekDates, onSlotsChange]);

  useEffect(() => {
    if (weekDates.length === 0) return;
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    setLoading(true);
    setLoadError(null);
    apiJson<ApiSlot[]>(`/api/teacher/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
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
  }, [weekDates]);

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
    };
  });

  async function toggleSlot(opt: (typeof slotOptions)[0]) {
    if (!selectedDate || toggling) return;
    setToggling(opt.id);
    try {
      if (opt.isAdded && opt.id && !opt.id.startsWith("opt-")) {
        await fetch(`/api/teacher/availability?id=${opt.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/teacher/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: selectedDate,
            startTime: opt.startTime,
            endTime: opt.endTime,
          }),
        });
      }
      const start = weekDates[0];
      const end = weekDates[weekDates.length - 1];
      const r = await apiJson<ApiSlot[]>(`/api/teacher/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      const data = r.ok ? r.data : [];
      setSlots(data);
      onSlotsChange?.(data);
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
          <p className="text-[var(--color-text-muted)] text-right mb-2 mt-6">בחרו שעות פנויות</p>
          {loading ? (
            <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {slotOptions.map((opt) => {
                const isSelected = opt.isAdded;
                const busy = toggling === opt.id;
                return (
                  <button
                    key={`${selectedDate}-${opt.startTime}-${opt.endTime}`}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleSlot(opt)}
                    className={cn(
                      "rounded-[var(--radius-input)] border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2",
                      isSelected &&
                        "border-[var(--color-primary)] bg-[var(--color-primary)] text-white",
                      !isSelected &&
                        "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)]",
                      busy && "opacity-50 cursor-wait"
                    )}
                  >
                    {opt.startTime}–{opt.endTime}
                    {isSelected && <span className="mr-1 text-xs opacity-90">פנוי</span>}
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
