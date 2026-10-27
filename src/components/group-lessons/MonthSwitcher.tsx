"use client";

import { monthLabel, nextMonthKey, previousMonthKey } from "@/lib/group-lessons";

/** Previous / current / next month. In RTL the previous month sits on the right. */
export function MonthSwitcher({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  const btn =
    "min-h-[40px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]";
  return (
    <div className="flex items-center gap-2" aria-label="בחירת חודש">
      <button type="button" className={btn} onClick={() => onChange(previousMonthKey(month))}>
        החודש הקודם
      </button>
      <p className="min-w-[8rem] text-center text-lg font-semibold text-[var(--color-text)]" aria-live="polite">
        {monthLabel(month)}
      </p>
      <button type="button" className={btn} onClick={() => onChange(nextMonthKey(month))}>
        החודש הבא
      </button>
    </div>
  );
}

/** "יום ה׳, 10 בדצמבר" from "2026-12-10". */
export function dayLabel(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** Lessons grouped by date, keeping order. */
export function groupByDate<T extends { date: string }>(items: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const it of items) map.set(it.date, [...(map.get(it.date) ?? []), it]);
  return Array.from(map.entries());
}
