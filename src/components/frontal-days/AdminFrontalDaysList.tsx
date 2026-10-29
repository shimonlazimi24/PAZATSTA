"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { apiJson } from "@/lib/api";
import type { DayTone } from "@/lib/frontal-days";
import { surveyRatio } from "@/lib/frontal-survey";

type Row = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  address: string;
  topic: string;
  teachersNeeded: number;
  teachers: string[];
  status: { label: string; tone: DayTone };
  past: boolean;
  survey: { count: number; classSize: number | null };
  report: { status: string; teacherName: string; answers: { label: string; value: string; internal?: boolean }[] } | null;
};

const REPORT_STATE: Record<string, string> = {
  submitted: "ממתין לאישור שלך",
  returned: "הוחזר למורה לתיקון",
  approved: "אושר ונשלח",
};

/** The closing report of a day that took place, readable right in the list. */
function DaySummary({ row }: { row: Row }) {
  const answers = row.report?.answers.filter((a) => a.value?.trim()) ?? [];
  return (
    <details className="group border-t border-dashed border-[var(--color-border)] px-4 py-2 sm:ps-24">
      <summary className="cursor-pointer list-none text-sm font-medium text-[var(--color-text)] [&::-webkit-details-marker]:hidden">
        <ChevronLeft className="me-1 inline h-4 w-4 align-[-3px] transition-transform group-open:-rotate-90" aria-hidden />
        סיכום היום
        <span className={`ms-2 font-normal ${row.report ? "text-[var(--color-text-muted)]" : "text-amber-800"}`}>
          {row.report ? `${row.report.teacherName} · ${REPORT_STATE[row.report.status] ?? ""}` : "עוד לא הוגש דוח סיום"}
        </span>
      </summary>
      <p className="mt-2 text-sm text-[var(--color-text)]">
        <span className="text-[var(--color-text-muted)]">סקר התלמידים: </span>
        {surveyRatio(row.survey.count, row.survey.classSize)}
      </p>
      {row.report && (
        <dl className="mt-2 grid gap-x-4 gap-y-1.5 rounded-md bg-[var(--color-bg-muted)]/60 px-3 py-2 text-sm sm:grid-cols-[12rem_1fr]">
          {answers.map((a, i) => (
            <div key={i} className="contents">
              <dt className="text-[var(--color-text-muted)]">
                {a.label}
                {a.internal && <span className="ms-1 text-xs">(פנימי)</span>}
              </dt>
              <dd className="whitespace-pre-line text-[var(--color-text)]">{a.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </details>
  );
}

const TONE: Record<DayTone, string> = {
  danger: "text-red-700 font-semibold",
  warning: "text-amber-800 font-medium",
  ok: "text-[var(--color-primary)]",
  muted: "text-[var(--color-text-muted)]",
};

function DateBlock({ date }: { date: string }) {
  const d = new Date(`${date}T12:00:00Z`);
  return (
    <div className="w-16 shrink-0 text-center">
      <p className="text-2xl font-bold leading-none tabular-nums text-[var(--color-text)]">{d.getUTCDate()}</p>
      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{d.toLocaleDateString("he-IL", { month: "short", timeZone: "UTC" })}</p>
    </div>
  );
}

function DayList({ rows }: { rows: Row[] }) {
  return (
    <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/admin/frontal-days/${r.id}`} className="flex gap-4 px-4 py-4 hover:bg-[var(--color-bg-muted)]/60">
            <DateBlock date={r.date} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="font-semibold text-[var(--color-text)]">{r.title}</p>
              <p className="text-sm text-[var(--color-text-muted)]">
                {r.startTime}–{r.endTime}, {r.address}
              </p>
              {r.topic && <p className="text-sm text-[var(--color-text)]">{r.topic}</p>}
            </div>
            <div className="w-44 shrink-0 text-left text-sm">
              <p className={TONE[r.status.tone]}>{r.status.label}</p>
              <p className="text-[var(--color-text-muted)]">
                {r.teachers.length} מתוך {r.teachersNeeded} מורים
              </p>
            </div>
          </Link>
          {r.past && r.status.tone !== "muted" && (r.report || r.teachers.length > 0) && <DaySummary row={r} />}
        </li>
      ))}
    </ul>
  );
}

export function AdminFrontalDaysList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    apiJson<Row[]>("/api/admin/frontal-days").then((r) => (r.ok ? setRows(r.data) : setError("לא הצלחנו לטעון את הימים.")));
  }, []);

  if (error) return <p className="text-sm text-red-700" role="alert">{error}</p>;
  if (!rows) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;

  const upcoming = rows.filter((r) => !r.past);
  const past = rows.filter((r) => r.past).reverse();
  const needAttention = past.filter((r) => r.status.tone === "warning").length;

  return (
    <div className="space-y-8">
      <section aria-labelledby="up-h" className="space-y-3">
        <h3 id="up-h" className="text-sm font-semibold text-[var(--color-text)]">ימים קרובים</h3>
        {upcoming.length === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-white px-5 py-8 text-center">
            <p>אין ימים פרונטליים מתוכננים.</p>
            <Link href="/admin/frontal-days/new" className="mt-2 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline">
              פתיחת יום חדש
            </Link>
          </div>
        ) : (
          <DayList rows={upcoming} />
        )}
      </section>

      {past.length > 0 && (
        <section aria-labelledby="past-h" className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h3 id="past-h" className="text-sm font-semibold text-[var(--color-text)]">ימים שעברו</h3>
            {needAttention > 0 && <p className="text-sm text-amber-800">{needAttention} מחכים לטיפול בדוח</p>}
            <button type="button" onClick={() => setShowPast((s) => !s)} className="text-sm text-[var(--color-primary)] underline">
              {showPast ? "הסתרה" : `הצגת ${past.length} ימים`}
            </button>
          </div>
          {showPast && <DayList rows={past} />}
        </section>
      )}
    </div>
  );
}
