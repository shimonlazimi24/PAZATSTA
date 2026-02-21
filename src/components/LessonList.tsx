"use client";

type Lesson = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  notes: string | null;
  student?: { email: string; name: string | null };
  teacher?: { email: string; name: string | null };
};

type LessonListProps = {
  lessons: Lesson[];
  emptyMessage?: string;
  showWho?: "student" | "teacher";
};

export function LessonList({
  lessons,
  emptyMessage = "No lessons.",
  showWho,
}: LessonListProps) {
  if (lessons.length === 0) {
    return <p className="text-sm text-gray-500 py-2">{emptyMessage}</p>;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {lessons.map((l) => {
        const start = new Date(l.startsAt);
        const end = new Date(start.getTime() + l.durationMinutes * 60 * 1000);
        const who = showWho === "student" ? l.student : l.teacher;
        const whoLabel = who
          ? who.name || who.email
          : null;
        return (
          <li key={l.id} className="py-3 first:pt-0">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="font-medium text-gray-900">
                  {start.toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at {start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                  – {end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </p>
                {whoLabel && (
                  <p className="text-sm text-gray-500 mt-0.5">with {whoLabel}</p>
                )}
                {l.notes && (
                  <p className="text-sm text-gray-600 mt-1">{l.notes}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {l.durationMinutes} min
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
