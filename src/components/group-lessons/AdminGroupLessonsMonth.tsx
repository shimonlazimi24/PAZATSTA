"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiJson } from "@/lib/api";
import { monthLabel } from "@/lib/group-lessons";
import { MonthSwitcher, dayLabel, groupByDate } from "./MonthSwitcher";

type Row = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  status: string;
  typeLabel: string;
  teachersNeeded: number;
  teachers: { id: string; name: string }[];
  reportsCount: number;
};
type MonthData = { month: string; lessons: Row[]; missingTeachers: { id: string; name: string }[]; teacherCount: number };

function Staffing({ row }: { row: Row }) {
  if (row.status === "canceled") return <span className="text-sm text-[var(--color-text-muted)]">בוטל</span>;
  const missing = row.teachersNeeded - row.teachers.length;
  return (
    <div className="text-sm">
      <p className={missing > 0 ? "font-medium text-amber-800" : "text-[var(--color-text)]"}>
        {row.teachers.length} מתוך {row.teachersNeeded} מדריכים
      </p>
      {row.teachers.length > 0 && (
        <p className="text-[var(--color-text-muted)]">{row.teachers.map((t) => t.name).join(", ")}</p>
      )}
    </div>
  );
}

export function AdminGroupLessonsMonth({ initialMonth }: { initialMonth: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(searchParams.get("month") || initialMonth);
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (m: string) => {
    setError(null);
    const r = await apiJson<MonthData>(`/api/admin/group-lessons?month=${m}`);
    if (r.ok) setData(r.data);
    else setError("לא הצלחנו לטעון את השיעורים. רעננו את הדף.");
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  function changeMonth(m: string) {
    setMonth(m);
    setData(null);
    router.replace(`/admin/group-lessons?month=${m}`, { scroll: false });
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthSwitcher month={month} onChange={changeMonth} />
        <div className="flex gap-2">
          <Link
            href="/admin/group-lessons/types"
            className="inline-flex min-h-[40px] items-center rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
          >
            סוגי שיעורים
          </Link>
          <Link
            href={`/admin/group-lessons/new?month=${month}`}
            className="inline-flex min-h-[40px] items-center rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:opacity-90"
          >
            שיעור חדש
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-[var(--radius-input)] bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {!data && !error && <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>}

      {data && (
        <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
          <section aria-label={`שיעורים ב${monthLabel(month)}`}>
            {data.lessons.length === 0 ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-white px-5 py-8 text-center">
                <p className="text-[var(--color-text)]">עוד אין שיעורים קבוצתיים ב{monthLabel(month)}.</p>
                <Link
                  href={`/admin/group-lessons/new?month=${month}`}
                  className="mt-3 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline"
                >
                  יצירת השיעור הראשון של החודש
                </Link>
              </div>
            ) : (
              <ol className="space-y-5">
                {groupByDate(data.lessons).map(([date, rows]) => (
                  <li key={date}>
                    <h3 className={`mb-2 text-sm font-semibold ${date < today ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"}`}>
                      {dayLabel(date)}
                    </h3>
                    <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
                      {rows.map((row) => (
                        <li key={row.id}>
                          <Link
                            href={`/admin/group-lessons/${row.id}`}
                            className={`grid gap-2 px-4 py-3 hover:bg-[var(--color-bg-muted)]/60 sm:grid-cols-[6rem_1fr_14rem] sm:items-start ${
                              row.status === "canceled" ? "opacity-60" : ""
                            }`}
                          >
                            <span className="text-sm tabular-nums text-[var(--color-text-muted)]">
                              {row.startTime}–{row.endTime}
                            </span>
                            <span>
                              <span className={`block font-medium text-[var(--color-text)] ${row.status === "canceled" ? "line-through" : ""}`}>
                                {row.typeLabel}
                              </span>
                              {row.location && <span className="block text-sm text-[var(--color-text-muted)]">{row.location}</span>}
                              {date < today && row.status === "open" && (
                                <span className="block text-sm text-[var(--color-text-muted)]">
                                  {row.reportsCount === 0 ? "עוד לא התקבל דוח" : `התקבלו ${row.reportsCount} דוחות`}
                                </span>
                              )}
                            </span>
                            <Staffing row={row} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <aside className="self-start rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">עוד לא נרשמו ב{monthLabel(month)}</h3>
            {data.missingTeachers.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                {data.teacherCount === 0 ? "אין מדריכים במערכת." : "כל המדריכים רשומים לשיעור החודש."}
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {data.missingTeachers.length} מתוך {data.teacherCount} מדריכים
                </p>
                <ul className="mt-3 space-y-1 text-sm text-[var(--color-text)]">
                  {data.missingTeachers.map((t) => (
                    <li key={t.id}>{t.name}</li>
                  ))}
                </ul>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
