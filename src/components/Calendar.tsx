"use client";

import { useState } from "react";

type CalendarProps = {
  eventsByDate: Record<string, number>; // "YYYY-MM-DD" -> count
  onSelectDate?: (date: string) => void;
  onMonthChange?: (year: number, month: number) => void;
  initialYear?: number;
  initialMonth?: number;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Calendar({
  eventsByDate,
  onSelectDate,
  onMonthChange,
  initialYear = new Date().getFullYear(),
  initialMonth = new Date().getMonth() + 1,
}: CalendarProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const startPad = first.getDay();
  const daysInMonth = last.getDate();
  const totalCells = startPad + daysInMonth;
  const rows = Math.ceil(totalCells / 7);

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
      onMonthChange?.(year - 1, 12);
    } else {
      setMonth((m) => m - 1);
      onMonthChange?.(year, month - 1);
    }
  }
  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
      onMonthChange?.(year + 1, 1);
    } else {
      setMonth((m) => m + 1);
      onMonthChange?.(year, month + 1);
    }
  }

  const monthLabel = first.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded hover:bg-gray-100 text-gray-600"
          aria-label="Previous month"
        >
          ←
        </button>
        <span className="font-semibold text-gray-900">{monthLabel}</span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded hover:bg-gray-100 text-gray-600"
          aria-label="Next month"
        >
          →
        </button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 font-medium mb-2">
          {DAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>
        <div
          className="grid grid-cols-7 gap-1"
          style={{ gridTemplateRows: `repeat(${rows}, minmax(2rem, 1fr))` }}
        >
          {Array.from({ length: startPad }, (_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const count = eventsByDate[dateStr] ?? 0;
            const isToday =
              dateStr ===
              `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
            return (
              <button
                key={dateStr}
                type="button"
                onClick={() => onSelectDate?.(dateStr)}
                className={`aspect-square flex flex-col items-center justify-center rounded text-sm ${
                  isToday
                    ? "bg-gray-900 text-white font-medium"
                    : "hover:bg-gray-100 text-gray-900"
                }`}
              >
                <span>{day}</span>
                {count > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isToday ? "bg-white" : "bg-gray-900"
                    }`}
                    title={`${count} lesson(s)`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
