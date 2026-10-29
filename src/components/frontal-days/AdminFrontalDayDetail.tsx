"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";
import { wazeUrl } from "@/lib/frontal-days";
import { FrontalDayForm, type FrontalDayValues } from "./FrontalDayForm";
import { TemplateEditor } from "./TemplateEditor";
import { ChecklistEditor } from "./ChecklistEditor";
import { QrCode } from "./QrCode";
import { surveyPath, surveyRatio, type QuestionSummary } from "@/lib/frontal-survey";

type Detail = FrontalDayValues & {
  id: string;
  status: string;
  messageTemplate: string;
  reminderTemplate: string;
  checklist: string[];
  signups: { teacherId: string; name: string; phone: string; checklistDone: string[] }[];
  report: {
    teacherName: string;
    answers: { label: string; value: string; internal?: boolean }[];
    status: "submitted" | "returned" | "approved";
    adminNote: string;
    sentToRecipientAt: string | null;
  } | null;
};
type Teacher = { id: string; name: string | null; email: string };
type SurveyData = { count: number; classSize: number | null; questions: QuestionSummary[] };

/** How many students answered, out of the class, and what they said. */
function SurveyResults({ id }: { id: string }) {
  const [data, setData] = useState<SurveyData | null>(null);
  useEffect(() => {
    apiJson<SurveyData>(`/api/admin/frontal-days/${id}/survey`).then((r) => r.ok && setData(r.data));
  }, [id]);
  if (!data) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;
  return (
    <div className="space-y-4">
      <p className="text-2xl font-bold text-[var(--color-text)]">{surveyRatio(data.count, data.classSize)}</p>
      {data.count > 0 &&
        data.questions.map((q) => (
          <details key={q.label} className="group rounded-md border border-[var(--color-border)] px-3 py-2" open={q.kind !== "text"}>
            <summary className="cursor-pointer text-sm font-medium text-[var(--color-text)]">
              {q.label} <span className="font-normal text-[var(--color-text-muted)]">({q.answered} ענו)</span>
            </summary>
            {q.kind === "choice" && (
              <ul className="mt-2 space-y-1.5">
                {q.counts.map((c) => {
                  const pct = q.answered ? Math.round((c.count / q.answered) * 100) : 0;
                  return (
                    <li key={c.option} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-2 text-sm">
                      <span className="truncate">{c.option}</span>
                      <span className="h-2.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                        <span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="text-left tabular-nums text-[var(--color-text-muted)]">
                        {c.count} ({pct}%)
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
            {q.kind === "number" && <p className="mt-2 text-sm">ממוצע: {q.average ?? "—"}</p>}
            {q.kind === "text" && (
              <ul className="mt-2 max-h-72 space-y-1.5 overflow-y-auto text-sm">
                {q.texts.map((t, i) => (
                  <li key={i} className="whitespace-pre-line rounded bg-[var(--color-bg-muted)]/60 px-2 py-1">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </details>
        ))}
    </div>
  );
}

const card = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5";
const btn = "min-h-[40px] rounded-[var(--radius-input)] px-4 text-sm font-medium disabled:opacity-50";
const primary = `${btn} bg-[var(--color-primary)] text-white hover:opacity-90`;
const secondary = `${btn} border border-[var(--color-border)] bg-white hover:bg-[var(--color-bg-muted)]`;

const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function AdminFrontalDayDetail({ id }: { id: string }) {
  const [day, setDay] = useState<Detail | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [assignId, setAssignId] = useState("");
  const [tab, setTab] = useState<"message" | "reminder" | "checklist">("message");
  const [tpl, setTpl] = useState<{ messageTemplate: string; reminderTemplate: string; checklist: string[] } | null>(null);
  const [tplSaved, setTplSaved] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [draft, setDraft] = useState<{ value: string; internal: boolean }[] | null>(null);
  const [includeSurvey, setIncludeSurvey] = useState(true);

  const load = useCallback(async () => {
    const r = await apiJson<Detail>(`/api/admin/frontal-days/${id}`);
    if (!r.ok) {
      setError(r.status === 404 ? "היום לא נמצא." : "לא הצלחנו לטעון את היום.");
      return;
    }
    setDay(r.data);
    setTpl((t) => t ?? { messageTemplate: r.data.messageTemplate, reminderTemplate: r.data.reminderTemplate, checklist: r.data.checklist });
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
      return false;
    }
    setNotice(done);
    await load();
    return true;
  }

  const json = (method: string, body: unknown) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  if (!day) return error ? <p className="text-red-700" role="alert">{error}</p> : <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const past = day.date < today;
  const canceled = day.status === "canceled";
  const signedIds = new Set(day.signups.map((s) => s.teacherId));
  const free = day.teachersNeeded - day.signups.length;
  const tplDirty =
    !!tpl && (tpl.messageTemplate !== day.messageTemplate || tpl.reminderTemplate !== day.reminderTemplate || tpl.checklist.join("\n") !== day.checklist.join("\n"));

  return (
    <div className="space-y-5">
      <Link href="/admin/frontal-days" className="inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        חזרה לימים הפרונטליים
      </Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className={`text-2xl font-bold text-[var(--color-text)] ${canceled ? "line-through" : ""}`}>{day.title}</h2>
          <p className="text-[var(--color-text)]">
            {dateLabel(day.date)}, {day.startTime}–{day.endTime}
          </p>
          <p className="text-[var(--color-text-muted)]">
            {day.address}{" "}
            <a href={wazeUrl(day.address)} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] underline">
              פתיחה בוויז
            </a>
          </p>
          {day.topic && <p className="text-[var(--color-text-muted)]">נושא: {day.topic}</p>}
          {canceled && <p className="font-medium text-red-700">היום בוטל.</p>}
        </div>
        {!canceled && !editing && (
          <div className="flex gap-2">
            <button type="button" className={secondary} onClick={() => setEditing(true)}>
              עריכת פרטים
            </button>
            <button
              type="button"
              disabled={busy}
              className={`${btn} border border-red-200 bg-red-50 text-red-800 hover:bg-red-100`}
              onClick={() => {
                if (!confirm(`לבטל את היום?${day.signups.length ? ` ${day.signups.length} המדריכים הרשומים יקבלו על כך מייל.` : ""}`)) return;
                act(() => apiJson(`/api/admin/frontal-days/${id}`, json("PATCH", { status: "canceled" })), "היום בוטל.");
              }}
            >
              ביטול היום
            </button>
          </div>
        )}
      </header>

      {(error || notice) && (
        <p className={`rounded-[var(--radius-input)] px-3 py-2 text-sm ${error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-800"}`} role={error ? "alert" : "status"}>
          {error ?? notice}
        </p>
      )}

      {editing && (
        <FrontalDayForm
          initial={day}
          submitLabel="שמירת הפרטים"
          onSubmit={async (v) => {
            const r = await apiJson(`/api/admin/frontal-days/${id}`, json("PATCH", v));
            if (!r.ok) return r.error;
            setEditing(false);
            setNotice(day.signups.length ? "הפרטים נשמרו. כדי שהמדריכים הרשומים יקבלו אותם, שלחו את ההודעה מחדש למטה." : "הפרטים נשמרו.");
            await load();
            return null;
          }}
        />
      )}

      {day.report && (
        <section className={`${card} ${day.report.status === "submitted" ? "border-amber-300" : ""}`} aria-labelledby="report-h">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="report-h" className="text-lg font-semibold">דוח סיום</h3>
            <p className="text-sm text-[var(--color-text-muted)]">הוגש על ידי {day.report.teacherName}</p>
          </div>
          {draft ? (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[var(--color-text-muted)]">עורכים את הנוסח שיישלח. השאלות נשארות כמו שהן.</p>
              {day.report.answers.map((a, i) => (
                <div key={a.label}>
                  <label htmlFor={`edit-${i}`} className="mb-1 block text-sm text-[var(--color-text-muted)]">
                    {a.label}
                  </label>
                  <textarea
                    id={`edit-${i}`}
                    rows={Math.min(8, Math.max(2, Math.ceil((draft[i]?.value.length ?? 0) / 70)))}
                    maxLength={4000}
                    className="w-full resize-y rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2"
                    value={draft[i]?.value ?? ""}
                    onChange={(e) => setDraft((d) => d && d.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                  />
                  <label className="mt-1 inline-flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                    <input
                      type="checkbox"
                      checked={draft[i]?.internal ?? false}
                      onChange={(e) => setDraft((d) => d && d.map((x, j) => (j === i ? { ...x, internal: e.target.checked } : x)))}
                    />
                    פנימי, לא לשלוח לבית הספר
                  </label>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className={primary}
                  onClick={() =>
                    act(() => apiJson(`/api/admin/frontal-days/${id}/report`, json("PATCH", { action: "edit", answers: draft })), "הסיכום נשמר.").then(
                      (ok) => ok && setDraft(null)
                    )
                  }
                >
                  שמירת הסיכום
                </button>
                <button type="button" disabled={busy} className={secondary} onClick={() => setDraft(null)}>
                  ביטול
                </button>
              </div>
            </div>
          ) : (
            <>
              <dl className="mt-4 space-y-3">
                {day.report.answers.map((a) => (
                  <div key={a.label}>
                    <dt className="text-sm text-[var(--color-text-muted)]">
                      {a.label}
                      {a.internal && <span className="ms-2 text-xs font-medium text-amber-800">פנימי, לא נשלח לבית הספר</span>}
                    </dt>
                    <dd className="whitespace-pre-wrap">{a.value || "לא מולא"}</dd>
                  </div>
                ))}
              </dl>
              {day.report.status !== "returned" && (
                <button
                  type="button"
                  className="mt-3 text-sm font-medium text-[var(--color-primary)] underline"
                  onClick={() => setDraft(day.report!.answers.map((a) => ({ value: a.value, internal: !!a.internal })))}
                >
                  עריכת הסיכום
                </button>
              )}
            </>
          )}
          {!draft && day.report.status === "returned" && (
            <p className="mt-4 text-sm text-amber-800">הדוח הוחזר למדריך לתיקון: {day.report.adminNote}</p>
          )}
          {!draft && day.report.status !== "returned" && (
            <div className="mt-5 space-y-3 border-t border-[var(--color-border)] pt-4">
              {day.report.status === "approved" && (
                <p className="text-sm text-[var(--color-primary)]">
                  נשלח אל {day.recipientName || day.recipientEmail}
                  {day.report.sentToRecipientAt &&
                    ` ב-${new Date(day.report.sentToRecipientAt).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jerusalem" })}`}
                  .
                </p>
              )}
              {day.recipientEmail ? (
                <>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={includeSurvey} onChange={(e) => setIncludeSurvey(e.target.checked)} />
                    לצרף את תוצאות סקר התלמידים (כמה ענו ואחוזים בשאלות הבחירה, בלי תשובות פתוחות)
                  </label>
                  <button
                    type="button"
                    disabled={busy}
                    className={day.report.status === "approved" ? secondary : primary}
                    onClick={() => {
                      const again = day.report!.status === "approved";
                      if (!confirm(`${again ? "לשלוח שוב" : "לאשר ולשלוח"} את הסיכום אל ${day.recipientEmail}?`)) return;
                      act(
                        () => apiJson(`/api/admin/frontal-days/${id}/report`, json("PATCH", { action: again ? "resend" : "approve", includeSurvey })),
                        again ? "הסיכום נשלח שוב." : "הדוח אושר ונשלח."
                      );
                    }}
                  >
                    {day.report.status === "approved" ? "שליחה מחדש" : "אישור ושליחה"} אל {day.recipientName || day.recipientEmail}
                  </button>
                </>
              ) : (
                <p className="text-sm text-amber-800">כדי לשלוח את הדוח, הוסיפו בפרטי היום את האימייל של מקבל הדוח.</p>
              )}
              {day.report.status === "submitted" && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <label htmlFor="return-note" className="sr-only">מה לתקן</label>
                  <input id="return-note" value={returnNote} onChange={(e) => setReturnNote(e.target.value)} placeholder="מה לתקן בדוח" className="min-h-[40px] flex-1 rounded-[var(--radius-input)] border border-[var(--color-border)] px-3" />
                  <button
                    type="button"
                    disabled={busy || !returnNote.trim()}
                    className={secondary}
                    onClick={() => act(() => apiJson(`/api/admin/frontal-days/${id}/report`, json("PATCH", { action: "return", note: returnNote })), "הדוח הוחזר למדריך.").then((ok) => ok && setReturnNote(""))}
                  >
                    החזרה למדריך
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {past && !day.report && !canceled && (
        <p className={`${card} text-amber-800`}>היום עבר ועוד לא הוגש דוח סיום. אחד המדריכים הרשומים ממלא אותו מהאזור האישי.</p>
      )}

      <section className={card} aria-labelledby="teachers-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="teachers-h" className="text-lg font-semibold">מדריכים</h3>
          <p className={`text-sm ${free > 0 && !canceled ? "font-medium text-amber-800" : "text-[var(--color-text-muted)]"}`}>
            {day.signups.length} מתוך {day.teachersNeeded}
            {free > 0 && !canceled ? `, חסרים ${free}` : ""}
          </p>
        </div>
        {day.signups.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">עוד אף מדריך לא נרשם.</p>
        ) : (
          <table className="mt-3 w-full text-right text-sm">
            <thead>
              <tr className="text-[var(--color-text-muted)]">
                <th className="py-1 font-medium">שם</th>
                <th className="py-1 font-medium">טלפון</th>
                <th className="py-1 font-medium">רשימת הכנות</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {day.signups.map((s) => {
                const done = s.checklistDone.length;
                const total = day.checklist.length;
                return (
                  <tr key={s.teacherId} className="border-t border-[var(--color-border)]">
                    <td className="py-2">{s.name}</td>
                    <td className="py-2" dir="ltr">
                      {s.phone ? <a href={`tel:${s.phone}`} className="hover:underline">{s.phone}</a> : "—"}
                    </td>
                    <td className={`py-2 tabular-nums ${total > 0 && done < total && !past ? "text-amber-800" : ""}`}>
                      {total === 0 ? "—" : done === total ? "הושלמה" : `${done} מתוך ${total}`}
                    </td>
                    <td className="py-2 text-left">
                      {!canceled && (
                        <button
                          type="button"
                          disabled={busy}
                          className="text-red-700 hover:underline disabled:opacity-50"
                          onClick={() => {
                            if (!confirm(`להסיר את ${s.name} מהיום? המדריך יקבל על כך מייל.`)) return;
                            act(() => apiJson(`/api/admin/frontal-days/${id}/signups?teacherId=${encodeURIComponent(s.teacherId)}`, { method: "DELETE" }), `${s.name} הוסר.`);
                          }}
                        >
                          הסרה
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!canceled && free > 0 && (
          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (assignId) act(() => apiJson(`/api/admin/frontal-days/${id}/signups`, json("POST", { teacherId: assignId })), "המדריך שובץ וקיבל את הודעת היום.").then(() => setAssignId(""));
            }}
          >
            <label htmlFor="fd-assign" className="sr-only">שיבוץ מדריך</label>
            <select id="fd-assign" value={assignId} onChange={(e) => setAssignId(e.target.value)} className="min-h-[40px] flex-1 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3">
              <option value="">בחרו מדריך לשיבוץ</option>
              {teachers.filter((t) => !signedIds.has(t.id)).map((t) => (
                <option key={t.id} value={t.id}>{t.name || t.email}</option>
              ))}
            </select>
            <button type="submit" disabled={busy || !assignId} className={primary}>
              שיבוץ
            </button>
          </form>
        )}
      </section>

      {!canceled && tpl && (
        <section className={card} aria-labelledby="msg-h">
          <h3 id="msg-h" className="text-lg font-semibold">הודעות ורשימת הכנות</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            ההודעה נשלחת למדריך כשהוא נרשם, והתזכורת יומיים לפני היום. שינוי כאן חל רק על היום הזה.
          </p>
          <div className="mt-4 flex gap-1 border-b border-[var(--color-border)]" role="tablist">
            {(
              [
                ["message", "הודעת הרשמה"],
                ["reminder", "תזכורת"],
                ["checklist", "רשימת הכנות"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === key ? "border-[var(--color-primary)] font-semibold text-[var(--color-text)]" : "border-transparent text-[var(--color-text-muted)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            {tab === "message" && (
              <TemplateEditor id="tpl-msg" label="ההודעה" value={tpl.messageTemplate} onChange={(v) => setTpl({ ...tpl, messageTemplate: v })} values={{ כותרת: day.title, כתובת: day.address, נושא: day.topic, מצגת: day.presentationUrl, איש_קשר: day.contactName, טלפון_איש_קשר: day.contactPhone, וואטסאפ: day.whatsappUrl, וויז: wazeUrl(day.address), שעות: `${day.startTime}–${day.endTime}`, תאריך: dateLabel(day.date) }} />
            )}
            {tab === "reminder" && (
              <TemplateEditor id="tpl-rem" label="התזכורת" value={tpl.reminderTemplate} onChange={(v) => setTpl({ ...tpl, reminderTemplate: v })} values={{ כותרת: day.title, כתובת: day.address, נושא: day.topic, מצגת: day.presentationUrl, איש_קשר: day.contactName, טלפון_איש_קשר: day.contactPhone, וואטסאפ: day.whatsappUrl, וויז: wazeUrl(day.address), שעות: `${day.startTime}–${day.endTime}`, תאריך: dateLabel(day.date) }} />
            )}
            {tab === "checklist" && <ChecklistEditor items={tpl.checklist} onChange={(items) => setTpl({ ...tpl, checklist: items })} />}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--color-border)] pt-4">
            <button
              type="button"
              disabled={busy || !tplDirty}
              className={primary}
              onClick={() =>
                act(
                  () => apiJson(`/api/admin/frontal-days/${id}`, json("PATCH", { templates: { ...tpl, checklist: tpl.checklist.map((x) => x.trim()).filter(Boolean) } })),
                  "השינויים נשמרו."
                ).then((ok) => ok && setTplSaved(true))
              }
            >
              שמירה
            </button>
            {day.signups.length > 0 && (tplSaved || !tplDirty) && tab !== "checklist" && (
              <button
                type="button"
                disabled={busy || tplDirty}
                className={secondary}
                onClick={() => {
                  if (!confirm(`לשלוח את ה${tab === "reminder" ? "תזכורת" : "הודעה"} מחדש ל-${day.signups.length} המדריכים הרשומים?`)) return;
                  act(() => apiJson(`/api/admin/frontal-days/${id}/notify`, json("POST", { kind: tab })), "נשלח מחדש לכל המדריכים הרשומים.");
                }}
              >
                שליחה מחדש למדריכים הרשומים
              </button>
            )}
            {tplDirty && <p className="text-sm text-[var(--color-text-muted)]">יש שינויים שלא נשמרו.</p>}
          </div>
        </section>
      )}

      {day.status !== "canceled" && (
        <section className={card} aria-labelledby="survey-h">
          <h3 id="survey-h" className="text-lg font-semibold">סקר משוב של התלמידים</h3>
          <p className="mb-4 mt-1 text-sm text-[var(--color-text-muted)]">
            התלמידים סורקים את ה-QR בסוף היום וממלאים בלי להתחבר. כל טלפון נספר פעם אחת. השאלות נערכות בהגדרות הימים הפרונטליים.
          </p>
          <SurveyResults id={id} />
        </section>
      )}

      {day.status !== "canceled" && (
        <section className={card} aria-labelledby="qr-h">
          <h3 id="qr-h" className="text-lg font-semibold">קודי QR לסוף היום</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">המדריכים רואים אותם באזור האישי ביום עצמו. אפשר גם להדפיס מכאן.</p>
          <div className="mt-4 flex flex-wrap gap-8">
            <figure className="space-y-2 text-center">
              <QrCode value={typeof window === "undefined" ? "" : `${window.location.origin}${surveyPath(id)}`} size={180} label="QR לסקר המשוב" />
              <figcaption className="text-sm">
                סקר משוב לתלמידים
                <a href={surveyPath(id)} target="_blank" rel="noreferrer" className="block text-xs text-[var(--color-primary)] underline">
                  פתיחת הסקר
                </a>
              </figcaption>
            </figure>
            {(day.courseUrl || day.courseCode) && (
              <figure className="space-y-2 text-center">
                {day.courseUrl && <QrCode value={day.courseUrl} size={180} label="QR לקורס המתנה" />}
                <figcaption className="text-sm">
                  קורס מתנה{day.courseCode && <span className="block font-mono text-lg font-semibold" dir="ltr">{day.courseCode}</span>}
                </figcaption>
              </figure>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
