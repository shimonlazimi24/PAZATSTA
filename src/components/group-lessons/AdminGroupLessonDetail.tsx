"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";
import { GroupLessonForm, saveGroupLesson } from "./GroupLessonForm";
import { dayLabel } from "./MonthSwitcher";

type Detail = {
  id: string;
  typeId: string;
  typeLabel: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  details: string;
  teachersNeeded: number;
  status: string;
  signups: { teacherId: string; name: string }[];
  reports: { teacherId: string; name: string; typeLabel: string; participants: number; notes: string; submittedAt: string }[];
};
type Teacher = { id: string; name: string | null; email: string };

const section = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5";

export function AdminGroupLessonDetail({ id }: { id: string }) {
  const [lesson, setLesson] = useState<Detail | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [assignId, setAssignId] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const r = await apiJson<Detail>(`/api/admin/group-lessons/${id}`);
    if (r.ok) setLesson(r.data);
    else setError(r.status === 404 ? "השיעור לא נמצא." : "לא הצלחנו לטעון את השיעור.");
  }, [id]);

  useEffect(() => {
    load();
    apiJson<Teacher[]>("/api/admin/teachers").then((r) => r.ok && setTeachers(r.data));
  }, [load]);

  async function act(run: () => Promise<{ ok: boolean; error?: string }>, done: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const r = await run();
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "הפעולה נכשלה");
      return;
    }
    setNotice(done);
    await load();
  }

  if (!lesson) {
    return error ? <p className="text-sm text-red-700" role="alert">{error}</p> : <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;
  }

  const canceled = lesson.status === "canceled";
  const free = lesson.teachersNeeded - lesson.signups.length;
  const signedIds = new Set(lesson.signups.map((s) => s.teacherId));
  const assignable = teachers.filter((t) => !signedIds.has(t.id));

  return (
    <div className="space-y-5">
      <Link href={`/admin/group-lessons?month=${lesson.date.slice(0, 7)}`} className="inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        חזרה ל{new Date(`${lesson.date}T12:00:00Z`).toLocaleDateString("he-IL", { month: "long", timeZone: "UTC" })}
      </Link>

      <header className="space-y-1">
        <h2 className={`text-xl font-bold text-[var(--color-text)] ${canceled ? "line-through" : ""}`}>{lesson.typeLabel}</h2>
        <p className="text-[var(--color-text-muted)]">
          {dayLabel(lesson.date)}, {lesson.startTime}–{lesson.endTime}
          {lesson.location ? `, ${lesson.location}` : ""}
        </p>
        {canceled && <p className="font-medium text-red-700">השיעור בוטל.</p>}
      </header>

      {(error || notice) && (
        <p className={`rounded-[var(--radius-input)] px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>
          {error ?? notice}
        </p>
      )}

      <section className={section} aria-labelledby="teachers-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="teachers-h" className="font-semibold text-[var(--color-text)]">מדריכים</h3>
          <p className={`text-sm ${free > 0 && !canceled ? "font-medium text-amber-800" : "text-[var(--color-text-muted)]"}`}>
            {lesson.signups.length} מתוך {lesson.teachersNeeded}
            {free > 0 && !canceled ? `, חסרים ${free}` : ""}
          </p>
        </div>
        {lesson.signups.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">עוד אף מדריך לא נרשם.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-border)]">
            {lesson.signups.map((s) => (
              <li key={s.teacherId} className="flex items-center justify-between py-2">
                <span>{s.name}</span>
                {!canceled && (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-sm text-red-700 hover:underline disabled:opacity-50"
                    onClick={() => {
                      if (!confirm(`להסיר את ${s.name} מהשיעור? המדריך יקבל על כך מייל.`)) return;
                      act(
                        () => apiJson(`/api/admin/group-lessons/${id}/signups?teacherId=${encodeURIComponent(s.teacherId)}`, { method: "DELETE" }),
                        `${s.name} הוסר מהשיעור.`
                      );
                    }}
                  >
                    הסרה
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!canceled && free > 0 && assignable.length > 0 && (
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!assignId) return;
              act(
                () =>
                  apiJson(`/api/admin/group-lessons/${id}/signups`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ teacherId: assignId }),
                  }),
                "המדריך שובץ וקיבל על כך מייל."
              ).then(() => setAssignId(""));
            }}
          >
            <label htmlFor="assign" className="sr-only">שיבוץ מדריך</label>
            <select id="assign" value={assignId} onChange={(e) => setAssignId(e.target.value)} className="min-h-[44px] flex-1 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3">
              <option value="">בחרו מדריך לשיבוץ</option>
              {assignable.map((t) => (
                <option key={t.id} value={t.id}>{t.name || t.email}</option>
              ))}
            </select>
            <button type="submit" disabled={busy || !assignId} className="min-h-[44px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-5 text-sm font-medium text-white disabled:opacity-50">
              שיבוץ
            </button>
          </form>
        )}
      </section>

      <section className={section} aria-labelledby="reports-h">
        <h3 id="reports-h" className="font-semibold text-[var(--color-text)]">דוחות</h3>
        {lesson.reports.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">עוד לא התקבלו דוחות. המדריכים ממלאים דוח אחרי השיעור.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {lesson.reports.map((r) => (
              <li key={r.teacherId} className="border-r-2 border-[var(--color-primary)] pr-3">
                <p className="font-medium">{r.name}</p>
                <dl className="mt-1 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
                  <dt className="text-[var(--color-text-muted)]">סוג השיעור</dt>
                  <dd>{r.typeLabel}</dd>
                  <dt className="text-[var(--color-text-muted)]">משתתפים שהגיעו</dt>
                  <dd className="tabular-nums">{r.participants}</dd>
                  <dt className="text-[var(--color-text-muted)]">הערות</dt>
                  <dd className="whitespace-pre-wrap">{r.notes || "אין"}</dd>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!canceled && (
        <section className={section}>
          {editing ? (
            <>
              <h3 className="mb-4 font-semibold text-[var(--color-text)]">עריכת השיעור</h3>
              <GroupLessonForm
                initial={{
                  typeId: lesson.typeId,
                  date: lesson.date,
                  startTime: lesson.startTime,
                  endTime: lesson.endTime,
                  location: lesson.location,
                  details: lesson.details,
                  teachersNeeded: lesson.teachersNeeded,
                }}
                submitLabel="שמירת השינויים"
                onSubmit={async (v) => {
                  const r = await saveGroupLesson(`/api/admin/group-lessons/${id}`, "PATCH", v);
                  if (!r.ok) return r.error;
                  setEditing(false);
                  setNotice("השינויים נשמרו.");
                  await load();
                  return null;
                }}
              />
            </>
          ) : (
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setEditing(true)} className="min-h-[44px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-5 text-sm font-medium hover:bg-[var(--color-bg-muted)]">
                עריכת פרטי השיעור
              </button>
              <button
                type="button"
                disabled={busy}
                className="min-h-[44px] rounded-[var(--radius-input)] border border-red-200 bg-red-50 px-5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50"
                onClick={() => {
                  const who = lesson.signups.length ? ` ${lesson.signups.length} המדריכים הרשומים יקבלו על כך מייל.` : "";
                  if (!confirm(`לבטל את השיעור?${who}`)) return;
                  act(
                    () =>
                      apiJson(`/api/admin/group-lessons/${id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "canceled" }),
                      }),
                    "השיעור בוטל."
                  );
                }}
              >
                ביטול השיעור
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
