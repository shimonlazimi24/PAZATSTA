"use client";

import { cn } from "@/lib/utils";

export interface TimeSlotOption {
  id: string;
  startTime: string;
  endTime: string;
  available: boolean;
  date?: string;
}

interface TimeSlotsProps {
  slots: TimeSlotOption[];
  selectedSlotId: string | null;
  onSelect: (slot: TimeSlotOption) => void;
}

export function TimeSlots({ slots, selectedSlotId, onSelect }: TimeSlotsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
      {slots.map((slot) => {
        const isSelected = selectedSlotId === slot.id;
        const disabled = !slot.available;
        return (
          <button
            key={slot.id}
            type="button"
            disabled={disabled}
            onClick={() => slot.available && onSelect(slot)}
            className={cn(
              "rounded-[var(--radius-input)] border px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2",
              isSelected &&
                "border-[var(--color-primary)] bg-[var(--color-primary)] text-white",
              !isSelected &&
                slot.available &&
                "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)]",
              disabled &&
                "cursor-not-allowed border-[var(--color-border)] bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] line-through"
            )}
          >
            {slot.startTime}–{slot.endTime}
            {slot.available && !isSelected && (
              <span className="mr-1 text-xs text-[var(--color-text-muted)]">פנוי</span>
            )}
            {!slot.available && <span className="mr-1 text-xs">תפוס</span>}
          </button>
        );
      })}
    </div>
  );
}
