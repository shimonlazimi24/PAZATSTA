"use client";

import { useState, useMemo } from "react";
import { formatIsraelYYYYMMDD, addDaysYYYYMMDD } from "@/lib/dates";
import { DateSelector } from "@/components/design/DateSelector";
import { Button } from "@/components/design/Button";

const SLOT_DURATION = 60;
const START_HOUR = 8;
const END_HOUR = 22;

function generateTimeOptions(): { startTime: string; endTime: string }[] {
  const out: { startTime: string; endTime: string }[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += SLOT_DURATION) {
      const start = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
      const endMin = h * 60 + m + SLOT_DURATION;
      const endH = Math.floor(endMin / 60);
      const endM = endMin % 60;
      const end = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
      if (endMin <= END_HOUR * 60) {
        out.push({ startTime: start, endTime: end });
      }
    }
  }
  return out;
}

const TIME_OPTIONS = generateTimeOptions();

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00.000Z");
  return d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "short" });
}

function formatWeekday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00.000Z");
  return d.toLocaleDateString("he-IL", { timeZone: "Asia/Jerusalem", weekday: "short" });
}

type RescheduleLessonModalProps = {
  lessonId: string;
  currentDate: string;
  currentStartTime: string;
  currentEndTime: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function RescheduleLessonModal({
  lessonId,
  currentDate,
  currentStartTime,
  currentEndTime,
  onClose,
  onSuccess,
}: RescheduleLessonModalProps) {
  const weekDates = useMemo(() => {
    const startStr = formatIsraelYYYYMMDD(new Date());
    const out: string[] = [startStr];
    for (let i = 1; i < 14; i++) out.push(addDaysYYYYMMDD(startStr, i));
    return out;
  }, []);

  const dateOptions = weekDates.map((date) => ({
    date,
    label: formatDateLabel(date),
    weekday: formatWeekday(date),
  }));

  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedSlot, setSelectedSlot] = useState(
    TIME_OPTIONS.find((o) => o.startTime === currentStartTime && o.endTime === currentEndTime) ?? TIME_OPTIONS[0]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/teacher/lessons/${lessonId}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          date: selectedDate,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setError((data as { error?: string }).error ?? "שגיאה בעדכון המועד");
      }
    } catch {
      setError("שגיאה בעדכון המועד");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-title"
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-lg"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="reschedule-title" className="text-lg font-semibold text-[var(--color-text)] mb-4">
          שינוי מועד שיעור
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">בחרו תאריך</p>
            <DateSelector
              options={dateOptions}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">בחרו שעה</p>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {TIME_OPTIONS.map((opt) => {
                const isSelected =
                  selectedSlot.startTime === opt.startTime && selectedSlot.endTime === opt.endTime;
                return (
                  <button
                    key={`${opt.startTime}-${opt.endTime}`}
                    type="button"
                    onClick={() => setSelectedSlot(opt)}
                    className={`rounded-[var(--radius-input)] border px-3 py-2 text-sm font-medium transition-colors ${
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                        : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                    }`}
                  >
                    {opt.startTime}–{opt.endTime}
                  </button>
                );
              })}
            </div>
          </div>
          {error && <p className="text-sm text-red-600 text-right">{error}</p>}
          <div className="flex gap-2 justify-start">
            <Button type="submit" disabled={saving}>
              {saving ? "מעדכן…" : "שמור מועד"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-input)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
