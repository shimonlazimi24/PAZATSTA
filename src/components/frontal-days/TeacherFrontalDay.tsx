"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";
import { QrCode } from "./QrCode";

type Field = { id: string; label: string; kind: "short" | "long" | "number"; required: boolean };
type Day = {
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
  wazeUrl?: string;
  presentationUrl?: string;
  contactName?: string;
  contactPhone?: string;
  whatsappUrl?: string;
  feedbackUrl?: string;
  courseCode?: string;
  courseUrl?: string;
  checklist?: string[];
  checklistDone?: string[];
  canWithdraw?: boolean;
  reportFields?: Field[];
  report?: { byMe: boolean; status: string; adminNote: string; answers: { label: string; value: string }[] } | null;
  otherTeacherReported?: boolean;
};

const dateLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const card = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5";
const bigLink = "flex min-h-[48px] items-center justify-center rounded-[var(--radius-input)] px-4 text-center font-medium";

function FullscreenQr({ title, value, code, onClose }: { title: string; value: string; code?: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-white p-6" dir="rtl">
      <h2 className="text-3xl font-bold text-[var(--color-text)]">{title}</h2>
      {value && <QrCode value={value} size={Math.min(420, typeof window !== "undefined" ? window.innerWidth - 64 : 320)} label={title} />}
      {code && (
        <p className="text-center">
          <span className="block text-lg text-[var(--color-text-muted)]">קוד גישה</span>
          <span className="block text-5xl font-bold tracking-wider" dir="ltr">{code}</span>
        </p>
      )}
      <button type="button" onClick={onClose} className="min-h-[48px] rounded-[var(--radius-input)] border border-[var(--color-border)] px-8 text-lg">
        סגירה
      </button>
    </div>
  );
}

export function TeacherFrontalDay({ id }: { id: string }) {
  const [day, setDay] = useState<Day | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [qr, setQr] = useState<"feedback" | "course" | null>(null);

  const load = useCallback(async () => {
    const r = await apiJson<Day>(`/api/teacher/frontal-days/${id}`);
    if (!r.ok) {
      setError(r.status === 404 ? "היום לא נמצא, או שההרשמה אליו נסגרה." : "לא הצלחנו לטעון את היום.");
      return;
    }
    setDay(r.data);
    setDone(r.data.checklistDone ?? []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(item: string) {
    const next = done.includes(item) ? done.filter((x) => x !== item) : [...done, item];
    setDone(next);
    const r = await apiJson<{ done: string[] }>(`/api/teacher/frontal-days/${id}/checklist`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: next }),
    });
    if (!r.ok) {
      setDone(done);
      setMessage({ ok: false, text: "הסימון לא נשמר. בדקו את החיבור ונסו שוב." });
    }
  }

  async function signup(method: "POST" | "DELETE") {
    if (method === "DELETE" && !confirm("לבטל את ההרשמה ליום?")) return;
    setBusy(true);
    setMessage(null);
    const r = await apiJson(`/api/teacher/frontal-days/${id}/signup`, { method });
    setBusy(false);
    if (!r.ok) return setMessage({ ok: false, text: r.error });
    setMessage({ ok: true, text: method === "POST" ? "נרשמת. שלחנו לך מייל עם כל הפרטים." : "ההרשמה בוטלה." });
    load();
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const r = await apiJson(`/api/teacher/frontal-days/${id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    setBusy(false);
    if (!r.ok) return setMessage({ ok: false, text: r.error });
    setMessage({ ok: true, text: "הדוח נשלח לשחר לאישור. תודה." });
    load();
  }

  const back = (
    <Link href="/teacher/frontal-days" className="inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
      חזרה לימים הפרונטליים
    </Link>
  );
  if (error) return <div className="space-y-3" dir="rtl">{back}<p>{error}</p></div>;
  if (!day) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });
  const dayOfOrAfter = day.date <= today;
  const canceled = day.status === "canceled";

  const header = (
    <header className="space-y-1">
      <h2 className={`text-2xl font-bold ${canceled ? "line-through" : ""}`}>{day.title}</h2>
      <p className="text-lg">
        {dateLabel(day.date)}, {day.startTime}–{day.endTime}
      </p>
      {day.topic && <p className="text-[var(--color-text-muted)]">{day.topic}</p>}
      {canceled && <p className="font-medium text-red-700">היום בוטל.</p>}
    </header>
  );

  const status = message && (
    <p className={`rounded-[var(--radius-input)] px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
      {message.text}
    </p>
  );

  if (!day.mine) {
    return (
      <div className="max-w-xl space-y-5" dir="rtl">
        {back}
        {header}
        <p className="text-[var(--color-text-muted)]">{day.address}</p>
        {status}
        {day.placesLeft > 0 ? (
          <div className={`${card} space-y-3`}>
            <p>{day.placesLeft === 1 ? "נשאר מקום אחד." : `נשארו ${day.placesLeft} מקומות.`} אחרי ההרשמה תקבלו מייל עם הכתובת, המצגת, איש הקשר וקבוצת הוואטסאפ.</p>
            <button type="button" disabled={busy} onClick={() => signup("POST")} className={`${bigLink} w-full bg-[var(--color-primary)] text-white disabled:opacity-50`}>
              {busy ? "נרשם…" : "הרשמה ליום"}
            </button>
          </div>
        ) : (
          <p className={card}>כל המקומות ביום הזה נתפסו.</p>
        )}
      </div>
    );
  }

  const checklist = day.checklist ?? [];
  const report = day.report;
  const canFillReport = dayOfOrAfter && !canceled && !day.otherTeacherReported && (!report || report.status === "returned");

  return (
    <div className="max-w-2xl space-y-5" dir="rtl">
      {back}
      {header}
      {status}

      {!canceled && (
        <section className={`${card} space-y-4`} aria-label="פרטי ההגעה">
          <div>
            <p className="text-sm text-[var(--color-text-muted)]">כתובת</p>
            <p className="text-lg">{day.address}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {day.wazeUrl && (
              <a href={day.wazeUrl} target="_blank" rel="noopener noreferrer" className={`${bigLink} bg-[var(--color-primary)] text-white`}>
                ניווט בוויז
              </a>
            )}
            {day.whatsappUrl && (
              <a href={day.whatsappUrl} target="_blank" rel="noopener noreferrer" className={`${bigLink} border border-[var(--color-border)]`}>
                הצטרפות לקבוצת הוואטסאפ
              </a>
            )}
            {day.presentationUrl && (
              <a href={day.presentationUrl} target="_blank" rel="noopener noreferrer" className={`${bigLink} border border-[var(--color-border)]`}>
                פתיחת המצגת
              </a>
            )}
            {day.contactPhone && (
              <a href={`tel:${day.contactPhone}`} className={`${bigLink} border border-[var(--color-border)]`}>
                התקשרות ל{day.contactName || "איש הקשר"}
              </a>
            )}
          </div>
          {day.contactName && (
            <p className="text-sm text-[var(--color-text-muted)]">
              איש קשר במקום: {day.contactName}
              {day.contactPhone && (
                <>
                  , <bdi dir="ltr">{day.contactPhone}</bdi>
                </>
              )}
            </p>
          )}
        </section>
      )}

      {!canceled && checklist.length > 0 && (
        <section className={card} aria-labelledby="cl-h">
          <div className="flex items-baseline justify-between gap-2">
            <h3 id="cl-h" className="text-lg font-semibold">הכנות לפני היום</h3>
            <p className={`text-sm tabular-nums ${done.length < checklist.length ? "text-amber-800" : "text-[var(--color-primary)]"}`}>
              {done.length === checklist.length ? "הכול מוכן" : `${done.length} מתוך ${checklist.length}`}
            </p>
          </div>
          <ul className="mt-3 space-y-1">
            {checklist.map((item) => (
              <li key={item}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[var(--radius-input)] px-2 hover:bg-[var(--color-bg-muted)]/60">
                  <input type="checkbox" className="h-5 w-5 accent-[var(--color-primary)]" checked={done.includes(item)} onChange={() => toggle(item)} />
                  <span className={done.includes(item) ? "text-[var(--color-text-muted)] line-through" : ""}>{item}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!canceled && dayOfOrAfter && (day.feedbackUrl || day.courseUrl || day.courseCode) && (
        <section className={card} aria-labelledby="end-h">
          <h3 id="end-h" className="text-lg font-semibold">סוף היום</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">הציגו לתלמידים על המסך המלא, כדי שיסרקו.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {day.feedbackUrl && (
              <button type="button" onClick={() => setQr("feedback")} className={`${bigLink} border border-[var(--color-border)]`}>
                QR למשוב התלמידים
              </button>
            )}
            {(day.courseUrl || day.courseCode) && (
              <button type="button" onClick={() => setQr("course")} className={`${bigLink} border border-[var(--color-border)]`}>
                QR וקוד לקורס המתנה
              </button>
            )}
          </div>
        </section>
      )}

      {!canceled && dayOfOrAfter && (
        <section className={card} aria-labelledby="rep-h">
          <h3 id="rep-h" className="text-lg font-semibold">דוח סיום</h3>
          {day.otherTeacherReported && !report?.byMe ? (
            <p className="mt-2 text-[var(--color-text-muted)]">מדריך אחר כבר הגיש את דוח הסיום של היום.</p>
          ) : report && report.status !== "returned" ? (
            <p className="mt-2">{report.status === "approved" ? "הדוח אושר ונשלח אל המקום. תודה." : "הדוח הוגש וממתין לאישור של שחר."}</p>
          ) : canFillReport ? (
            <form onSubmit={submitReport} className="mt-3 space-y-4">
              {report?.status === "returned" && (
                <p className="rounded-[var(--radius-input)] bg-amber-50 px-3 py-2 text-sm text-amber-900">שחר החזיר את הדוח לתיקון: {report.adminNote}</p>
              )}
              {(day.reportFields ?? []).map((f) => (
                <div key={f.id}>
                  <label htmlFor={`rf-${f.id}`} className="mb-1 block text-sm font-medium">
                    {f.label}
                    {!f.required && <span className="font-normal text-[var(--color-text-muted)]"> (רשות)</span>}
                  </label>
                  {f.kind === "long" ? (
                    <textarea id={`rf-${f.id}`} rows={4} maxLength={4000} className="w-full resize-y rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2" value={answers[f.id] ?? prev(report, f.label)} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.value })} />
                  ) : (
                    <input id={`rf-${f.id}`} type={f.kind === "number" ? "number" : "text"} inputMode={f.kind === "number" ? "numeric" : undefined} min={f.kind === "number" ? 0 : undefined} className={`min-h-[44px] rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 ${f.kind === "number" ? "w-40" : "w-full"}`} value={answers[f.id] ?? prev(report, f.label)} onChange={(e) => setAnswers({ ...answers, [f.id]: e.target.value })} />
                  )}
                </div>
              ))}
              <button type="submit" disabled={busy} className="min-h-[48px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-6 font-medium text-white disabled:opacity-50">
                {busy ? "שולח…" : "שליחה לאישור"}
              </button>
            </form>
          ) : null}
        </section>
      )}

      {day.canWithdraw && (
        <button type="button" disabled={busy} onClick={() => signup("DELETE")} className="text-sm text-[var(--color-text-muted)] underline hover:text-red-700">
          ביטול ההרשמה ליום
        </button>
      )}

      {qr === "feedback" && day.feedbackUrl && <FullscreenQr title="משוב על היום" value={day.feedbackUrl} onClose={() => setQr(null)} />}
      {qr === "course" && <FullscreenQr title="קורס מתנה" value={day.courseUrl ?? ""} code={day.courseCode} onClose={() => setQr(null)} />}
    </div>
  );
}

/** When a returned report is reopened, its previous answers fill the form by label. */
function prev(report: Day["report"], label: string): string {
  return report?.status === "returned" ? report.answers.find((a) => a.label === label)?.value ?? "" : "";
}
