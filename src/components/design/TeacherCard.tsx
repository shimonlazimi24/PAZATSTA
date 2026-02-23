"use client";

import { cn } from "@/lib/utils";
import type { MockTeacher } from "@/data/mockTeachers";

interface TeacherCardProps {
  teacher: MockTeacher;
  selected?: boolean;
  onSelect?: () => void;
}

export function TeacherCard({ teacher, selected, onSelect }: TeacherCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[var(--radius-card)] border bg-white p-4 text-right shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2",
        selected ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] ring-offset-2" : "border-[var(--color-border)]"
      )}
    >
      <div className="flex gap-4">
        <div className="h-16 w-16 shrink-0 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] flex items-center justify-center text-[var(--color-text-muted)] text-xs border-2 border-white shadow">
          תמונה
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[var(--color-text)]">{teacher.name}</h3>
          <p className="mt-0.5 text-sm text-[var(--color-text-muted)] line-clamp-2">{teacher.bio}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]">
              {teacher.availabilityLabel}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {teacher.specialties.slice(0, 3).map((s) => (
              <span
                key={s}
                className="rounded-md bg-[var(--color-bg-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </button>
  );
}
