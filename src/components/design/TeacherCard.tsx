"use client";

import { cn } from "@/lib/utils";
import { TeacherAvatar } from "@/components/TeacherAvatar";
import type { TeacherView } from "@/types/teacher";

interface TeacherCardProps {
  teacher: TeacherView;
  selected?: boolean;
  onSelect?: () => void;
}

export function TeacherCard({ teacher, selected, onSelect }: TeacherCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[var(--radius-card)] border bg-white p-4 text-right shadow-[var(--shadow-card)] transition-all hover:shadow-[var(--shadow-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
        selected ? "border-[var(--color-primary)] ring-2 ring-[var(--color-primary)] ring-offset-2" : "border-[var(--color-border)]"
      )}
    >
      <div className="flex gap-4">
        <div className="h-16 w-16 shrink-0 rounded-[var(--radius-card)] overflow-hidden border-2 border-white shadow">
          <TeacherAvatar
            avatarType={teacher.avatarType}
            profileImageUrl={teacher.photo}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm">
            <span className="text-[var(--color-text-muted)]">שם: </span>
            <span className="font-bold text-[var(--color-text)]">{teacher.name}</span>
          </div>
          {(teacher.specialties?.length ?? 0) > 0 && (
            <p className="mt-1 text-sm">
              <span className="text-[var(--color-text-muted)]">התמחויות: </span>
              <span className="text-[var(--color-text)]">
                {teacher.specialties!.join(" • ")}
              </span>
            </p>
          )}
          {teacher.bio && (
            <p className="mt-1.5 text-sm text-[var(--color-text-muted)] line-clamp-2">{teacher.bio}</p>
          )}
        </div>
      </div>
    </button>
  );
}
