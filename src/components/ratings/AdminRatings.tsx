"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { apiJson } from "@/lib/api";
import type { RatingItem, RatingMode } from "@/lib/ratings";
import { RatingTile } from "./RatingTile";

type TeacherRow = { id: string; name: string; images: number; videos: number; lessonsDone: number; items: RatingItem[] };

/** Every teacher with how many ratings they uploaded next to how many lessons they completed; a row opens the files. */
export function AdminRatings() {
  const [data, setData] = useState<{ mode: RatingMode; teachers: TeacherRow[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await apiJson<{ mode: RatingMode; teachers: TeacherRow[] }>("/api/admin/ratings");
    if (r.ok) setData(r.data);
    else setError(r.error || "לא הצלחנו לטעון. רעננו את הדף.");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    const r = await apiJson(`/api/teacher/ratings/${id}`, { method: "DELETE" });
    if (!r.ok) return setError(r.error || "המחיקה נכשלה");
    await load();
  }

  if (error) return <p className="rounded-[var(--radius-input)] bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>;
  if (!data) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;

  const total = data.teachers.reduce((n, t) => n + t.items.length, 0);

  return (
    <div className="space-y-4">
      {data.mode === "off" && (
        <p className="rounded-[var(--radius-input)] bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
          ההעלאה עוד לא הופעלה: צריך לחבר אחסון קבצים לאתר. עד אז המורים לא רואים את הסקשן.
        </p>
      )}
      <p className="text-sm text-[var(--color-text-muted)]">
        סך הכול {total} העלאות מ-{data.teachers.filter((t) => t.items.length > 0).length} מורים מתוך {data.teachers.length}.
      </p>
      <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
        {data.teachers.map((t) => (
          <li key={t.id}>
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-[var(--color-bg-muted)]/60 [&::-webkit-details-marker]:hidden">
                <ChevronLeft className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition-transform group-open:-rotate-90" aria-hidden />
                <span className="min-w-0 flex-1 font-medium text-[var(--color-text)]">{t.name}</span>
                <span className={`text-sm tabular-nums ${t.items.length ? "font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                  העלה {t.items.length}
                </span>
                <span className="text-sm tabular-nums text-[var(--color-text-muted)]">
                  {t.images} תמונות · {t.videos} סרטונים
                </span>
                <span className="text-sm tabular-nums text-[var(--color-text-muted)]">עשה {t.lessonsDone} שיעורים</span>
              </summary>
              <div className="border-t border-dashed border-[var(--color-border)] p-4">
                {t.items.length === 0 ? (
                  <p className="text-sm text-[var(--color-text-muted)]">עוד לא העלה דירוגים.</p>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {t.items.map((i) => (
                      <RatingTile key={i.id} item={i} onDelete={remove} />
                    ))}
                  </ul>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
