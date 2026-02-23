"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherAvailability } from "@/components/TeacherAvailability";
import { apiJson } from "@/lib/api";
import { formatIsraelYYYYMMDD, addDaysYYYYMMDD } from "@/lib/dates";

type ApiSlot = { id: string; date: string; startTime: string; endTime: string };

/** Israel-safe week: avoid toISOString().slice(0,10) which is UTC and can shift the day in Israel. */
function buildWeekDatesIsrael(): string[] {
  const startStr = formatIsraelYYYYMMDD(new Date());
  const out: string[] = [startStr];
  for (let i = 1; i < 7; i++) {
    out.push(addDaysYYYYMMDD(startStr, i));
  }
  return out;
}

export default function TeacherAvailabilityPage() {
  const weekDates = useMemo(() => buildWeekDatesIsrael(), []);
  const [slots, setSlots] = useState<ApiSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    setLoading(true);
    apiJson<ApiSlot[]>(`/api/teacher/availability?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
      .then((r) => {
        if (r.ok) setSlots(r.data);
        else setSlots([]);
      })
      .finally(() => setLoading(false));
  }, [weekDates]);

  const hasSlots = slots.length > 0;

  return (
    <AppShell title="הגדרת זמינות">
      <div className="max-w-2xl space-y-6" dir="rtl">
        <p className="text-sm text-[var(--color-text-muted)]">
          הוסיפו משבצות זמן שבהן אתם פנויים לשיעורים. תלמידים יוכלו לבחור מהמשבצות האלה.
        </p>
        <TeacherAvailability weekDates={weekDates} onSlotsChange={setSlots} />
        <div className="flex flex-col gap-3">
          {!loading && !hasSlots && (
            <p className="text-sm text-[var(--color-text-muted)] text-right">
              הוסיפו לפחות משבצת אחת (לחיצה על שעה) כדי להמשיך לדשבורד.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Link
              href="/teacher/dashboard"
              className="rounded-[var(--radius-input)] border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
            >
              חזרה לדשבורד
            </Link>
            {hasSlots ? (
              <Link
                href="/teacher/dashboard"
                className="rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 text-center inline-block"
              >
                המשך
              </Link>
            ) : (
              <span
                className="rounded-[var(--radius-input)] bg-[var(--color-border)] text-[var(--color-text-muted)] px-4 py-2.5 text-sm font-medium cursor-not-allowed inline-block text-center"
                aria-disabled
              >
                המשך
              </span>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
