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
        <div className="h-16 w-16 shrink-0 rounded-[var(--radius-card)] overflow-hidden bg-[var(--color-bg-muted)] border-2 border-white shadow flex items-center justify-center text-[var(--color-text-muted)] text-xs">
          {teacher.photo ? (
            <img src={teacher.photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>תמונה</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm">
            <span className="text-[var(--color-text-muted)]">שם: </span>
            <span className="font-bold text-[var(--color-text)]">{teacher.name}</span>
          </div>
          {(teacher.specialization ?? (teacher.specialties?.length ? teacher.specialties[0] : null)) && (
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              <span className="text-[var(--color-text-muted)]">התמחות: </span>
              <span className="text-[var(--color-text)]">
                {teacher.specialization ?? teacher.specialties?.slice(0, 2).join(" • ") ?? ""}
              </span>
            </p>
          )}
          {teacher.bio && (
            <p className="mt-1.5 text-sm text-[var(--color-text-muted)] line-clamp-2">{teacher.bio}</p>
          )}
          {!teacher.specialization && (teacher.specialties?.length ?? 0) > 1 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {teacher.specialties!.slice(1, 4).map((s) => (
                <span
                  key={s}
                  className="rounded-md bg-[var(--color-bg-muted)] px-2 py-0.5 text-xs text-[var(--color-text-muted)]"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
