"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
        <Link href={`/teacher/group-lessons/${l.id}/report`} className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--color-primary)] px-3 text-sm font-medium text-white hover:opacity-90">
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
    <button type="button" disabled={busy} onClick={onSignUp} className="min-h-[44px] rounded-md border border-[var(--color-primary)] bg-white px-4 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-50">
      הרשמה
    </button>
  );
}

export function TeacherGroupLessons() {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const [month, setMonth] = useState(monthKeyOf(today));
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (message) statusRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [message]);
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
    <div className="max-w-3xl space-y-8" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">שיעורים קבוצתיים</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">כל מורה מעביר לפחות שיעור קבוצתי אחד בחודש. בחרו שיעור והירשמו.</p>
      </header>
      {data && (
        <section aria-label="החובה החודשית">
          <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {data.requirement.map((r) => (
              <li key={r.month} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>{monthLabel(r.month)}</span>
                {r.met ? (
                  <span className="text-sm font-medium text-[var(--color-primary)]">נרשמת לשיעור</span>
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
        <section aria-label="דוחות שחסרים" className="rounded-md bg-amber-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-amber-900">מחכים לדוח שלך</h2>
          <ul className="mt-2 space-y-2">
            {data.awaitingReport.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {r.typeLabel}, {dayLabel(r.date)}
                </span>
                <Link href={`/teacher/group-lessons/${r.id}/report`} className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--color-primary)] px-3 text-sm font-medium text-white hover:opacity-90">
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
        <p ref={statusRef} className={`rounded-[var(--radius-input)] px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}

      {!data ? (
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      ) : data.lessons.length === 0 ? (
        <p className="border-y border-[var(--color-border)] py-8 text-center text-[var(--color-text)]">
          עוד לא פורסמו שיעורים קבוצתיים ל{monthLabel(month)}. כשההרשמה תיפתח תקבלו מייל.
        </p>
      ) : (
        <ol className="space-y-5">
          {groupByDate(data.lessons).map(([date, lessons]) => (
            <li key={date}>
              <h3 className={`mb-2 text-sm font-semibold ${date < today ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"}`}>{dayLabel(date)}</h3>
              <ul className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                {lessons.map((l) => (
                  <li key={l.id} className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between ${l.mine ? "border-r-[3px] border-r-[var(--color-primary)] pr-3" : ""}`}>
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
