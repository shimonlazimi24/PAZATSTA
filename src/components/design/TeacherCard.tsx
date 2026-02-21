"use client";

import { cn } from "@/lib/utils";
import type { MockTeacher } from "@/data/mockTeachers";
function StarIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

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
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-highlight)] px-2 py-0.5 text-xs font-medium text-[var(--color-text)]">
              <StarIcon />
              {teacher.rating} ({teacher.reviewCount})
            </span>
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
