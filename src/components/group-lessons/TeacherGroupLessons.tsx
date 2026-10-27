"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";
import { monthLabel, monthKeyOf } from "@/lib/group-lessons";
import { MonthSwitcher, dayLabel, groupByDate } from "./MonthSwitcher";

type Lesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string | null;
  details: string | null;
  typeLabel: string;
  status: string;
  placesLeft: number;
  teachersNeeded: number;
  mine: boolean;
  started: boolean;
  canWithdraw: boolean;
  reported: boolean;
};
type Data = {
  month: string;
  requirement: { month: string; met: boolean }[];
  awaitingReport: { id: string; date: string; startTime: string; typeLabel: string }[];
  lessons: Lesson[];
};

function LessonAction({ l, busy, onSignUp, onWithdraw }: { l: Lesson; busy: boolean; onSignUp: () => void; onWithdraw: () => void }) {
  if (l.status === "canceled") return <p className="text-sm font-medium text-red-700">השיעור בוטל</p>;
  if (l.mine) {
    if (l.started) {
      return l.reported ? (
        <p className="text-sm text-[var(--color-text-muted)]">הדוח נשלח</p>
      ) : (
        <Link href={`/teacher/group-lessons/${l.id}/report`} className="inline-flex min-h-[40px] items-center rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white">
          מילוי דוח
        </Link>
      );
    }
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <p className="text-sm font-medium text-[var(--color-primary)]">נרשמת לשיעור</p>
        {l.canWithdraw ? (
          <button type="button" disabled={busy} onClick={onWithdraw} className="text-sm text-[var(--color-text-muted)] underline hover:text-red-700 disabled:opacity-50">
            ביטול ההרשמה
          </button>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)]">לביטול פנו לשחר</p>
        )}
      </div>
    );
  }
  if (l.started) return <p className="text-sm text-[var(--color-text-muted)]">השיעור עבר</p>;
  if (l.placesLeft === 0) return <p className="text-sm text-[var(--color-text-muted)]">השיעור מלא</p>;
  return (
    <button type="button" disabled={busy} onClick={onSignUp} className="min-h-[40px] rounded-[var(--radius-input)] border border-[var(--color-primary)] bg-white px-4 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50">
      הרשמה
    </button>
  );
}

export function TeacherGroupLessons() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const [month, setMonth] = useState(monthKeyOf(today));
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (m: string) => {
    const r = await apiJson<Data>(`/api/teacher/group-lessons?month=${m}`);
    if (r.ok) setData(r.data);
    else setMessage({ ok: false, text: "לא הצלחנו לטעון את השיעורים. רעננו את הדף." });
  }, []);

  useEffect(() => {
    load(month);
  }, [month, load]);

  async function act(l: Lesson, method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm("לבטל את ההרשמה לשיעור?")) return;
    setBusyId(l.id);
    setMessage(null);
    const r = await apiJson(`/api/teacher/group-lessons/${l.id}/signup`, { method });
    setBusyId(null);
    setMessage(
      r.ok
        ? { ok: true, text: method === "POST" ? `נרשמת ל${l.typeLabel}, ${dayLabel(l.date)}. תקבלו תזכורת יום לפני.` : "ההרשמה בוטלה." }
        : { ok: false, text: r.error }
    );
    load(month);
  }

  return (
    <div className="space-y-6" dir="rtl">
      {data && (
        <section aria-label="החובה החודשית" className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
          <h2 className="font-semibold text-[var(--color-text)]">שיעור קבוצתי אחד בכל חודש</h2>
          <ul className="mt-3 space-y-2">
            {data.requirement.map((r) => (
              <li key={r.month} className="flex flex-wrap items-center justify-between gap-2">
                <span>{monthLabel(r.month)}</span>
                {r.met ? (
                  <span className="text-sm font-medium text-[var(--color-primary)]">נרשמת</span>
                ) : (
                  <button type="button" onClick={() => setMonth(r.month)} className="text-sm font-medium text-amber-800 underline">
                    עוד לא נרשמת, לבחירת שיעור
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data && data.awaitingReport.length > 0 && (
        <section aria-label="דוחות שחסרים" className="rounded-[var(--radius-card)] border border-amber-300 bg-amber-50 p-5">
          <h2 className="font-semibold text-amber-900">מחכים לדוח שלך</h2>
          <ul className="mt-3 space-y-2">
            {data.awaitingReport.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {r.typeLabel}, {dayLabel(r.date)}
                </span>
                <Link href={`/teacher/group-lessons/${r.id}/report`} className="inline-flex min-h-[40px] items-center rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white">
                  מילוי דוח
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MonthSwitcher
        month={month}
        onChange={(m) => {
          setData(null);
          setMonth(m);
        }}
      />

      {message && (
        <p className={`rounded-[var(--radius-input)] px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}

      {!data ? (
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      ) : data.lessons.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-white px-5 py-8 text-center text-[var(--color-text)]">
          עוד לא פורסמו שיעורים קבוצתיים ל{monthLabel(month)}. כשההרשמה תיפתח תקבלו מייל.
        </p>
      ) : (
        <ol className="space-y-5">
          {groupByDate(data.lessons).map(([date, lessons]) => (
            <li key={date}>
              <h3 className={`mb-2 text-sm font-semibold ${date < today ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"}`}>{dayLabel(date)}</h3>
              <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
                {lessons.map((l) => (
                  <li key={l.id} className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between ${l.mine ? "border-r-4 border-r-[var(--color-primary)]" : ""}`}>
                    <div className="space-y-1">
                      <p className="font-medium text-[var(--color-text)]">{l.typeLabel}</p>
                      <p className="text-sm tabular-nums text-[var(--color-text-muted)]">
                        {l.startTime}–{l.endTime}
                        {l.location ? `, ${l.location}` : ""}
                      </p>
                      {l.details && <p className="max-w-prose whitespace-pre-wrap text-sm text-[var(--color-text)]">{l.details}</p>}
                      {!l.mine && !l.started && l.status === "open" && l.placesLeft > 0 && (
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {l.placesLeft === 1 ? "נשאר מקום אחד" : `נשארו ${l.placesLeft} מקומות`}
                        </p>
                      )}
                    </div>
                    <LessonAction l={l} busy={busyId === l.id} onSignUp={() => act(l, "POST")} onWithdraw={() => act(l, "DELETE")} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
