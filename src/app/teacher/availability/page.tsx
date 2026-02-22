"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherAvailability } from "@/components/TeacherAvailability";

type ApiSlot = { id: string; date: string; startTime: string; endTime: string };

function getWeekDates(): string[] {
  const d = new Date();
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(d);
    x.setDate(d.getDate() + i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

export default function TeacherAvailabilityPage() {
  const [slots, setSlots] = useState<ApiSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const weekDates = getWeekDates();

  useEffect(() => {
    const start = weekDates[0];
    const end = weekDates[weekDates.length - 1];
    setLoading(true);
    fetch(`/api/teacher/availability?start=${start}&end=${end}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSlots)
      .finally(() => setLoading(false));
  }, []);

  const hasSlots = slots.length > 0;

  return (
    <AppShell title="הגדרת זמינות">
      <div className="max-w-2xl space-y-6" dir="rtl">
        <p className="text-sm text-[var(--color-text-muted)]">
          הוסיפו משבצות זמן שבהן אתם פנויים לשיעורים. תלמידים יוכלו לבחור מהמשבצות האלה.
        </p>
        <TeacherAvailability onSlotsChange={setSlots} />
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
