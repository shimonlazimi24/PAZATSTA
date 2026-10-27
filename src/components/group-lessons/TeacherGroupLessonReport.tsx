"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";

type FormData = {
  lesson: { typeLabel: string; dateLabel: string; timeRange: string; location: string | null; typeId: string };
  types: { id: string; category: string; name: string }[];
  canReport: boolean;
  reason: string | null;
  submitted: { typeLabel: string; participants: number; notes: string } | null;
};

const field = "w-full min-h-[44px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 py-2 text-right";

export function TeacherGroupLessonReport({ id }: { id: string }) {
  const [data, setData] = useState<FormData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [typeId, setTypeId] = useState("");
  const [participants, setParticipants] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    apiJson<FormData>(`/api/teacher/group-lessons/${id}/report`).then((r) => {
      if (!r.ok) {
        setLoadError(r.status === 404 ? "השיעור לא נמצא." : "לא הצלחנו לטעון את השיעור.");
        return;
      }
      setData(r.data);
      setTypeId(r.data.lesson.typeId);
    });
  }, [id]);

  const grouped = useMemo(() => {
    const map = new Map<string, FormData["types"]>();
    for (const t of data?.types ?? []) map.set(t.category, [...(map.get(t.category) ?? []), t]);
    return Array.from(map.entries());
  }, [data]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const r = await apiJson(`/api/teacher/group-lessons/${id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ typeId, participants, notes }),
    });
    setSending(false);
    if (r.ok) setSent(true);
    else setError(r.error);
  }

  const back = (
    <Link href="/teacher/group-lessons" className="inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
      חזרה לשיעורים הקבוצתיים
    </Link>
  );

  if (loadError) return <div className="space-y-3">{back}<p className="text-red-700" role="alert">{loadError}</p></div>;
  if (!data) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;

  const header = (
    <header className="space-y-1">
      <h2 className="text-xl font-bold text-[var(--color-text)]">דוח שיעור קבוצתי</h2>
      <p className="text-[var(--color-text-muted)]">
        {data.lesson.typeLabel}, {data.lesson.dateLabel}, {data.lesson.timeRange}
      </p>
    </header>
  );

  if (sent || data.submitted) {
    return (
      <div className="max-w-xl space-y-4" dir="rtl">
        {back}
        {header}
        <p className="rounded-[var(--radius-input)] bg-green-50 px-4 py-3 text-green-800" role="status">
          {sent ? "הדוח נשלח לשחר. תודה." : "כבר שלחת דוח על השיעור הזה."}
        </p>
      </div>
    );
  }

  if (!data.canReport) {
    return (
      <div className="max-w-xl space-y-4" dir="rtl">
        {back}
        {header}
        <p className="text-[var(--color-text)]">{data.reason}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5" dir="rtl">
      {back}
      {header}
      <form onSubmit={submit} className="space-y-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
        <div>
          <label htmlFor="r-type" className="mb-1 block text-sm font-medium">סוג השיעור שהועבר</label>
          <select id="r-type" className={field} value={typeId} onChange={(e) => setTypeId(e.target.value)} required>
            {grouped.map(([cat, list]) => (
              <optgroup key={cat} label={cat}>
                {list.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">אם בפועל הועבר סוג אחר, בחרו אותו.</p>
        </div>
        <div className="sm:w-48">
          <label htmlFor="r-count" className="mb-1 block text-sm font-medium">כמה משתתפים הגיעו</label>
          <input id="r-count" type="number" inputMode="numeric" min={0} max={1000} className={field} value={participants} onChange={(e) => setParticipants(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="r-notes" className="mb-1 block text-sm font-medium">הערות</label>
          <textarea id="r-notes" rows={5} maxLength={4000} className={`${field} min-h-[120px] resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="מה עבד, מה כדאי לשנות, משהו שחשוב שהצוות יידע" />
        </div>
        {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button type="submit" disabled={sending || participants === ""} className="min-h-[44px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-6 font-medium text-white disabled:opacity-50">
            {sending ? "שולח…" : "שליחת הדוח"}
          </button>
          <p className="text-xs text-[var(--color-text-muted)]">אחרי השליחה אי אפשר לערוך את הדוח.</p>
        </div>
      </form>
    </div>
  );
}
