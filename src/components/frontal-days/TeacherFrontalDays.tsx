"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";

type Row = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  address: string;
  topic: string;
  status: string;
  placesLeft: number;
  mine: boolean;
  past: boolean;
  checklistTotal: number;
  checklistDone: number;
  reportStatus: string;
};

const dateLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

function nextStep(r: Row): { text: string; urgent: boolean } {
  if (r.status === "canceled") return { text: "היום בוטל", urgent: false };
  if (r.past) {
    if (r.reportStatus === "none") return { text: "צריך למלא דוח סיום", urgent: true };
    if (r.reportStatus === "returned") return { text: "הדוח הוחזר לתיקון", urgent: true };
    if (r.reportStatus === "submitted") return { text: "הדוח ממתין לאישור", urgent: false };
    return { text: "הדוח אושר", urgent: false };
  }
  if (r.checklistTotal > 0 && r.checklistDone < r.checklistTotal) return { text: `הכנות: ${r.checklistDone} מתוך ${r.checklistTotal}`, urgent: true };
  return { text: "מוכן ליום", urgent: false };
}

export function TeacherFrontalDays() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<Row[]>("/api/teacher/frontal-days").then((r) => (r.ok ? setRows(r.data) : setError("לא הצלחנו לטעון את הימים. רעננו את הדף.")));
  }, []);

  if (error) return <p className="text-red-700" role="alert">{error}</p>;
  if (!rows) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;

  const mine = rows.filter((r) => r.mine).sort((a, b) => (a.past === b.past ? (a.past ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)) : a.past ? 1 : -1));
  const open = rows.filter((r) => !r.mine && r.status === "open" && !r.past);

  return (
    <div className="max-w-3xl space-y-8" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">ימים פרונטליים</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">ימי הדרכה בבתי ספר. אחרי ההרשמה תקבלו את כל הפרטים ורשימת הכנות.</p>
      </header>
      <section aria-labelledby="mine-h" className="space-y-3">
        <h2 id="mine-h" className="text-lg font-semibold">הימים שלי</h2>
        {mine.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">עוד לא נרשמת ליום פרונטלי.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {mine.map((r) => {
              const step = nextStep(r);
              return (
                <li key={r.id}>
                  <Link href={`/teacher/frontal-days/${r.id}`} className="flex flex-col gap-1 py-4 hover:bg-[var(--color-bg-muted)]/40 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="block font-semibold">{r.title}</span>
                      <span className="block text-sm text-[var(--color-text-muted)]">
                        {dateLabel(r.date)}, {r.startTime}–{r.endTime}
                      </span>
                    </span>
                    <span className={`text-sm ${step.urgent ? "font-medium text-amber-800" : "text-[var(--color-text-muted)]"}`}>{step.text}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="open-h" className="space-y-3">
        <h2 id="open-h" className="text-lg font-semibold">ימים פתוחים להרשמה</h2>
        {open.length === 0 ? (
          <p className="text-[var(--color-text-muted)]">אין כרגע ימים פתוחים. כשייפתח יום חדש הוא יופיע כאן.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {open.map((r) => (
              <li key={r.id}>
                <Link href={`/teacher/frontal-days/${r.id}`} className="flex flex-col gap-1 py-4 hover:bg-[var(--color-bg-muted)]/40 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="block font-semibold">{r.title}</span>
                    <span className="block text-sm text-[var(--color-text-muted)]">
                      {dateLabel(r.date)}, {r.startTime}–{r.endTime}, {r.address}
                    </span>
                    {r.topic && <span className="block text-sm">{r.topic}</span>}
                  </span>
                  <span className="text-sm text-[var(--color-primary)]">{r.placesLeft === 1 ? "נשאר מקום אחד" : `נשארו ${r.placesLeft} מקומות`}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
