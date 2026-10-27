"use client";

import { useEffect, useMemo, useState } from "react";
import { apiJson } from "@/lib/api";

type LessonType = { id: string; category: string; name: string; active: boolean };
export type GroupLessonValues = {
  typeId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  details: string;
  teachersNeeded: number;
};

const field = "w-full min-h-[44px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 py-2 text-right";
const labelCls = "block text-sm font-medium text-[var(--color-text)] mb-1";

/** Create or edit a group lesson. `onSubmit` returns an error message, or null on success. */
export function GroupLessonForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial: GroupLessonValues;
  submitLabel: string;
  onSubmit: (v: GroupLessonValues) => Promise<string | null>;
}) {
  const [values, setValues] = useState(initial);
  const [types, setTypes] = useState<LessonType[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiJson<LessonType[]>("/api/admin/group-lesson-types").then((r) => setTypes(r.ok ? r.data : []));
  }, []);

  const byCategory = useMemo(() => {
    const map = new Map<string, LessonType[]>();
    for (const t of types ?? []) {
      if (!t.active && t.id !== initial.typeId) continue;
      map.set(t.category, [...(map.get(t.category) ?? []), t]);
    }
    return Array.from(map.entries());
  }, [types, initial.typeId]);

  const set = <K extends keyof GroupLessonValues>(k: K, v: GroupLessonValues[K]) => setValues((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const err = await onSubmit(values);
    setSaving(false);
    if (err) setError(err);
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5" noValidate>
      <div>
        <label htmlFor="gl-type" className={labelCls}>סוג השיעור</label>
        <select id="gl-type" className={field} value={values.typeId} onChange={(e) => set("typeId", e.target.value)} required>
          <option value="">{types === null ? "טוען…" : "בחרו סוג שיעור"}</option>
          {byCategory.map(([category, list]) => (
            <optgroup key={category} label={category}>
              {list.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="gl-date" className={labelCls}>תאריך</label>
          <input id="gl-date" type="date" className={field} value={values.date} onChange={(e) => set("date", e.target.value)} required />
        </div>
        <div>
          <label htmlFor="gl-start" className={labelCls}>שעת התחלה</label>
          <input id="gl-start" type="time" className={field} value={values.startTime} onChange={(e) => set("startTime", e.target.value)} required />
        </div>
        <div>
          <label htmlFor="gl-end" className={labelCls}>שעת סיום</label>
          <input id="gl-end" type="time" className={field} value={values.endTime} onChange={(e) => set("endTime", e.target.value)} required />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div>
          <label htmlFor="gl-location" className={labelCls}>מיקום</label>
          <input id="gl-location" className={field} value={values.location} onChange={(e) => set("location", e.target.value)} placeholder="כתובת, או קישור לזום" />
        </div>
        <div>
          <label htmlFor="gl-needed" className={labelCls}>מדריכים דרושים</label>
          <input
            id="gl-needed"
            type="number"
            min={1}
            max={50}
            className={field}
            value={values.teachersNeeded}
            onChange={(e) => set("teachersNeeded", Number(e.target.value))}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="gl-details" className={labelCls}>פרטים למדריכים</label>
        <textarea
          id="gl-details"
          rows={4}
          maxLength={4000}
          className={`${field} min-h-[100px] resize-y`}
          value={values.details}
          onChange={(e) => set("details", e.target.value)}
          placeholder="מה להכין, איך מגיעים, למי לפנות"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">הפרטים מופיעים למדריכים בהרשמה ובמייל התזכורת.</p>
      </div>

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="min-h-[44px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-6 font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "שומר…" : submitLabel}
      </button>
    </form>
  );
}

export async function saveGroupLesson(url: string, method: "POST" | "PATCH", v: GroupLessonValues) {
  return apiJson<{ id?: string }>(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(v),
  });
}
