"use client";

import { cn } from "@/lib/utils";

export interface DateOption {
  date: string;
  label: string;
  weekday: string;
}

interface DateSelectorProps {
  options: DateOption[];
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

export function DateSelector({ options, selectedDate, onSelect }: DateSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isSelected = selectedDate === opt.date;
        return (
          <button
            key={opt.date}
            type="button"
            onClick={() => onSelect(opt.date)}
            className={cn(
              "rounded-[var(--radius-input)] border px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2",
              isSelected
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)]"
            )}
          >
            <span className="block text-xs opacity-90">{opt.weekday}</span>
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
