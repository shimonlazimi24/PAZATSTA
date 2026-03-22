"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminStatisticsResponse } from "@/lib/admin-statistics-types";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function rangeLastDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { from: isoFromDate(from), to: isoFromDate(to) };
}

function rangeThisMonthLocal(): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: isoFromDate(start), to: isoFromDate(end) };
}

type Preset = "7d" | "30d" | "month" | "custom";

function KPICard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-[var(--color-text-muted)] text-right">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--color-text)] text-right tabular-nums">
        {value}
      </p>
      {sub ? (
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)] text-right">{sub}</p>
      ) : null}
    </div>
  );
}

function BarChart({
  title,
  data,
  max,
  colorCompleted,
  colorCanceled,
}: {
  title: string;
  data: Array<{ date: string; completed: number; canceled: number }>;
  max: number;
  colorCompleted: string;
  colorCanceled: string;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 text-right">{title}</h3>
        <p className="text-sm text-[var(--color-text-muted)] text-right">אין נתונים בטווח.</p>
      </div>
    );
  }

  const m = max > 0 ? max : 1;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 overflow-x-auto">
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 text-right">{title}</h3>
      <div className="flex items-end gap-1 min-h-[180px] pb-6 pt-2" dir="ltr">
        {data.map((row) => {
          const hDone = (row.completed / m) * 100;
          const hCan = (row.canceled / m) * 100;
          const label = row.date.slice(5);
          return (
            <div
              key={row.date}
              className="flex flex-col items-center justify-end flex-1 min-w-[20px] max-w-[40px]"
            >
              <div className="flex w-full gap-px items-end justify-center h-32">
                <div
                  className="w-1/2 rounded-t-sm min-h-[2px] transition-all"
                  style={{
                    height: `${Math.max(hDone, row.completed ? 4 : 0)}%`,
                    backgroundColor: colorCompleted,
                  }}
                  title={`הושלמו: ${row.completed}`}
                />
                <div
                  className="w-1/2 rounded-t-sm min-h-[2px] transition-all"
                  style={{
                    height: `${Math.max(hCan, row.canceled ? 4 : 0)}%`,
                    backgroundColor: colorCanceled,
                  }}
                  title={`בוטלו: ${row.canceled}`}
                />
              </div>
              <span className="text-[9px] text-[var(--color-text-muted)] mt-1 rotate-0 whitespace-nowrap">
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-4 justify-end text-xs text-[var(--color-text-muted)] mt-2">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colorCompleted }} />
          הושלמו
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: colorCanceled }} />
          בוטלו
        </span>
      </div>
    </div>
  );
}

function HorizontalBars({
  title,
  rows,
  labelKey,
  valueKey,
  max,
}: {
  title: string;
  rows: Array<Record<string, string | number>>;
  labelKey: string;
  valueKey: string;
  max: number;
}) {
  const m = max > 0 ? max : 1;
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 text-right">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-right">אין נתונים.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row, i) => {
            const v = Number(row[valueKey]);
            const pct = Math.round((v / m) * 100);
            return (
              <li key={i}>
                <div className="flex justify-between text-xs text-[var(--color-text)] mb-0.5">
                  <span className="tabular-nums">{v}</span>
                  <span>{String(row[labelKey])}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--color-bg-muted)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AdminStatisticsDashboard() {
  const initialRange = useMemo(() => rangeLastDays(30), []);
  const [preset, setPreset] = useState<Preset>("30d");
  const [customFrom, setCustomFrom] = useState(initialRange.from);
  const [customTo, setCustomTo] = useState(initialRange.to);
  const [range, setRange] = useState(() => initialRange);
  const [data, setData] = useState<AdminStatisticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(
    () => `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
    [range]
  );

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/statistics?${queryString}`, {
        credentials: "include",
        signal,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string }).error ?? "שגיאה בטעינה");
      }
      const json = (await res.json()) as AdminStatisticsResponse;
      if (signal?.aborted) return;
      setData(json);
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (aborted) return;
      setError(e instanceof Error ? e.message : "שגיאה");
      setData(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const applyPreset = (p: Preset) => {
    setPreset(p);
    const r =
      p === "7d"
        ? rangeLastDays(7)
        : p === "30d"
          ? rangeLastDays(30)
          : p === "month"
            ? rangeThisMonthLocal()
            : null;
    if (r) {
      setRange(r);
      setCustomFrom(r.from);
      setCustomTo(r.to);
    }
  };

  const applyCustom = () => {
    if (!customFrom || !customTo || customFrom > customTo) return;
    setPreset("custom");
    setRange({ from: customFrom, to: customTo });
  };

  const chartMax = useMemo(() => {
    if (!data?.series.length) return 1;
    return Math.max(
      1,
      ...data.series.map((s) => s.completed + s.canceled)
    );
  }, [data]);

  const hourMax = useMemo(() => {
    if (!data?.timeDistribution.byHour.length) return 1;
    return Math.max(1, ...data.timeDistribution.byHour.map((h) => h.count));
  }, [data]);

  const wdMax = useMemo(() => {
    if (!data?.timeDistribution.byWeekday.length) return 1;
    return Math.max(1, ...data.timeDistribution.byWeekday.map((w) => w.count));
  }, [data]);

  return (
    <div className="max-w-5xl w-full space-y-6">
      <div className="text-right">
        <h2 className="text-xl font-bold text-[var(--color-text)]">סטטיסטיקות</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          סיכום פעילות שיעורים לפי תאריך השיעור (שדה תאריך במערכת).
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2 justify-end">
          {(
            [
              ["7d", "7 ימים אחרונים"],
              ["30d", "30 ימים אחרונים"],
              ["month", "חודש נוכחי"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => applyPreset(id)}
              className={`rounded-[var(--radius-input)] px-3 py-2 text-sm font-medium min-h-[44px] ${
                preset === id
                  ? "bg-[var(--color-primary)] text-white"
                  : "border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 justify-end">
          <span className="text-sm text-[var(--color-text-muted)]">טווח מותאם:</span>
          <input
            type="date"
            value={customFrom}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              setPreset("custom");
            }}
            className="rounded-[var(--radius-input)] border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
          <span className="text-[var(--color-text-muted)]">–</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => {
              setCustomTo(e.target.value);
              setPreset("custom");
            }}
            className="rounded-[var(--radius-input)] border border-[var(--color-border)] px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={applyCustom}
            disabled={!customFrom || !customTo || customFrom > customTo}
            className="rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-medium hover:bg-[var(--color-bg-muted)] disabled:opacity-50"
          >
            החל
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-muted)] text-right">
        מציג: {range.from} — {range.to}
      </p>

      {error ? (
        <div className="rounded-[var(--radius-input)] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-right">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-[var(--radius-card)] bg-[var(--color-bg-muted)] animate-pulse"
            />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard label="סה״כ שיעורים" value={data.summary.totalLessons} />
            <KPICard label="הושלמו" value={data.summary.completed} />
            <KPICard label="בוטלו" value={data.summary.canceled} />
            <KPICard
              label="שיעור ביטולים"
              value={`${data.summary.cancellationRate}%`}
            />
            <KPICard label="תלמידים פעילים" value={data.summary.activeStudents} />
            <KPICard label="מורים פעילים" value={data.summary.activeTeachers} />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2 text-right">
              תלמידים בטווח (לפי מספר שיעורים)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard
                label="תלמידים עם שיעור בודד"
                value={data.summary.studentsWithSingleLesson}
                sub="שיעור אחד בלבד בטווח"
              />
              <KPICard
                label="תלמידים חוזרים"
                value={data.summary.studentsWithMultipleLessons}
                sub="2 שיעורים ומעלה בטווח"
              />
              <KPICard
                label="שיעור חוזרים מתוך פעילים"
                value={`${data.summary.repeatStudentsPercent}%`}
                sub="מכל התלמידים עם שיעור בטווח"
              />
            </div>
          </div>

          <BarChart
            title="שיעורים לאורך זמן (לפי יום)"
            data={data.series}
            max={chartMax}
            colorCompleted="var(--color-primary)"
            colorCanceled="#d97706"
          />

          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 text-right">
              ביטולים
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-right">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">סה״כ ביטולים בטווח</p>
                <p className="text-lg font-semibold tabular-nums">{data.cancellations.total}</p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {data.cancellations.ratePercent}% מהשיעורים בטווח
                </p>
              </div>
              {!data.cancellations.hasTracking ? (
                <p className="text-sm text-[var(--color-text-muted)] self-center">
                  פירוט לפי סיבה / מבטל אינו זמין — השדות עדיין לא נשמרים במסד הנתונים. ניתן להוסיף
                  בהמשך (סיבת ביטול, מבטל).
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {data.cancellations.byReason.length > 0 ? (
                    <ul className="space-y-1">
                      {data.cancellations.byReason.map((r) => (
                        <li key={r.reason} className="flex justify-between gap-2">
                          <span className="tabular-nums">{r.count}</span>
                          <span>{r.reason}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 overflow-x-auto">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3 text-right">
              ביצועי מורים
            </h3>
            {data.teachers.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] text-right">אין שיעורים בטווח.</p>
            ) : (
              <table className="w-full text-sm text-right min-w-[640px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                    <th className="py-2 px-2 font-medium">מורה</th>
                    <th className="py-2 px-2 font-medium tabular-nums">סה״כ</th>
                    <th className="py-2 px-2 font-medium tabular-nums">הושלמו</th>
                    <th className="py-2 px-2 font-medium tabular-nums">בוטלו</th>
                    <th className="py-2 px-2 font-medium tabular-nums">% ביטול</th>
                    <th className="py-2 px-2 font-medium tabular-nums">שעות הוראה (הושלמו)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.teachers.map((t) => (
                    <tr key={t.teacherId} className="border-b border-[var(--color-border)]/60">
                      <td className="py-2 px-2">{t.name}</td>
                      <td className="py-2 px-2 tabular-nums">{t.totalLessons}</td>
                      <td className="py-2 px-2 tabular-nums">{t.completed}</td>
                      <td className="py-2 px-2 tabular-nums">{t.canceled}</td>
                      <td className="py-2 px-2 tabular-nums">{t.cancellationRate}%</td>
                      <td className="py-2 px-2 tabular-nums">{t.teachingHours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <HorizontalBars
              title="שעות שיעור נפוצות (התחלה)"
              rows={data.timeDistribution.byHour.map((h) => ({
                label: h.label,
                count: h.count,
              }))}
              labelKey="label"
              valueKey="count"
              max={hourMax}
            />
            <HorizontalBars
              title="ימים בשבוע (ישראל)"
              rows={data.timeDistribution.byWeekday.map((w) => ({
                label: w.weekdayLabel,
                count: w.count,
              }))}
              labelKey="label"
              valueKey="count"
              max={wdMax}
            />
          </div>

          {data.insights.length > 0 ? (
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-muted)]/50 p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)] mb-2 text-right">
                תובנות
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-[var(--color-text)] text-right marker:text-[var(--color-primary)]">
                {data.insights.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
              <p className="text-xs text-[var(--color-text-muted)] mt-3 text-right">
                השוואה לתקופה קודמת באורך זהה: {data.previousRange.from} — {data.previousRange.to}
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
