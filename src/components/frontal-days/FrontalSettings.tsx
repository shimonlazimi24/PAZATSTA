"use client";

import { useCallback, useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import { TemplateEditor } from "./TemplateEditor";
import { ChecklistEditor } from "./ChecklistEditor";

type Defaults = { messageTemplate: string; reminderTemplate: string; checklist: string[] };
type Field = { id: string; label: string; kind: "short" | "long" | "number"; required: boolean; sortOrder: number; active: boolean };

const KIND_LABEL: Record<Field["kind"], string> = { short: "שורה אחת", long: "טקסט חופשי", number: "מספר" };
const card = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5";
const input = "min-h-[40px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3";

function Status({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p className={`rounded-[var(--radius-input)] px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
      {message.text}
    </p>
  );
}

function ReportFields() {
  const [fields, setFields] = useState<Field[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState<{ label: string; kind: Field["kind"]; required: boolean }>({ label: "", kind: "long", required: true });

  const load = useCallback(async () => {
    const r = await apiJson<Field[]>("/api/admin/frontal-report-fields");
    setFields(r.ok ? r.data : []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function patch(f: Field, body: Partial<Field>, done: string) {
    const r = await apiJson(`/api/admin/frontal-report-fields/${f.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setMessage(r.ok ? { ok: true, text: done } : { ok: false, text: r.error });
    load();
  }

  if (!fields) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;
  const active = fields.filter((f) => f.active);
  const hidden = fields.filter((f) => !f.active);

  return (
    <div className="space-y-4">
      <Status message={message} />
      <ol className="divide-y divide-[var(--color-border)]">
        {active.map((f, i) => (
          <li key={f.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
            <span className="w-6 text-sm tabular-nums text-[var(--color-text-muted)]">{i + 1}</span>
            <div className="flex-1">
              <p className="font-medium">{f.label}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {KIND_LABEL[f.kind]}, {f.required ? "חובה" : "רשות"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {i > 0 && (
                <button type="button" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]" onClick={() => {
                  const prev = active[i - 1];
                  patch(f, { sortOrder: prev.sortOrder }, "הסדר עודכן.").then(() => patch(prev, { sortOrder: f.sortOrder }, "הסדר עודכן."));
                }}>
                  למעלה
                </button>
              )}
              <button type="button" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]" onClick={() => patch(f, { required: !f.required }, f.required ? "השדה הפך לרשות." : "השדה הפך לחובה.")}>
                {f.required ? "להפוך לרשות" : "להפוך לחובה"}
              </button>
              <button type="button" className="text-red-700 hover:underline" onClick={() => patch(f, { active: false }, `"${f.label}" הוסר מהדוח.`)}>
                הסרה מהדוח
              </button>
            </div>
          </li>
        ))}
      </ol>
      <form
        className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-4 sm:flex-row sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await apiJson("/api/admin/frontal-report-fields", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
          if (!r.ok) return setMessage({ ok: false, text: r.error });
          setMessage({ ok: true, text: `"${draft.label}" נוסף לדוח.` });
          setDraft({ label: "", kind: "long", required: true });
          load();
        }}
      >
        <div className="flex-1">
          <label htmlFor="nf-label" className="mb-1 block text-sm">שדה חדש</label>
          <input id="nf-label" className={`${input} w-full`} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="למשל: האם ההנהלה הייתה מעורבת" />
        </div>
        <div>
          <label htmlFor="nf-kind" className="mb-1 block text-sm">סוג</label>
          <select id="nf-kind" className={input} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Field["kind"] })}>
            <option value="long">טקסט חופשי</option>
            <option value="short">שורה אחת</option>
            <option value="number">מספר</option>
          </select>
        </div>
        <label className="flex min-h-[40px] items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} />
          חובה
        </label>
        <button type="submit" disabled={!draft.label.trim()} className="min-h-[40px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white disabled:opacity-50">
          הוספה
        </button>
      </form>
      {hidden.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-[var(--color-text-muted)]">שדות שהוסרו ({hidden.length})</summary>
          <ul className="mt-2 space-y-1">
            {hidden.map((f) => (
              <li key={f.id} className="flex justify-between gap-2">
                <span>{f.label}</span>
                <button type="button" className="text-[var(--color-primary)] underline" onClick={() => patch(f, { active: true }, `"${f.label}" חזר לדוח.`)}>
                  החזרה
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-xs text-[var(--color-text-muted)]">דוחות שכבר הוגשו נשמרים כפי שהוגשו, גם אם משנים כאן את השדות.</p>
    </div>
  );
}

export function FrontalSettings() {
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [saved, setSaved] = useState<Defaults | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiJson<Defaults>("/api/admin/frontal-settings").then((r) => {
      if (r.ok) {
        setDefaults(r.data);
        setSaved(r.data);
      }
    });
  }, []);

  if (!defaults) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;
  const dirty = JSON.stringify(defaults) !== JSON.stringify(saved);

  return (
    <div className="space-y-6">
      <section className={`${card} space-y-6`} aria-labelledby="def-h">
        <div>
          <h3 id="def-h" className="text-lg font-semibold">הודעות ורשימת הכנות לימים חדשים</h3>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">כל יום חדש מתחיל מכאן. ימים שכבר נפתחו לא משתנים.</p>
        </div>
        <TemplateEditor id="def-msg" label="הודעה למדריך שנרשם" value={defaults.messageTemplate} onChange={(v) => setDefaults({ ...defaults, messageTemplate: v })} />
        <TemplateEditor id="def-rem" label="תזכורת יומיים לפני" value={defaults.reminderTemplate} onChange={(v) => setDefaults({ ...defaults, reminderTemplate: v })} />
        <div>
          <p className="mb-2 text-sm font-medium">רשימת הכנות</p>
          <ChecklistEditor items={defaults.checklist} onChange={(items) => setDefaults({ ...defaults, checklist: items })} />
        </div>
        <Status message={message} />
        <button
          type="button"
          disabled={!dirty || saving}
          className="min-h-[44px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-6 font-medium text-white disabled:opacity-50"
          onClick={async () => {
            setSaving(true);
            const body = { ...defaults, checklist: defaults.checklist.map((x) => x.trim()).filter(Boolean) };
            const r = await apiJson("/api/admin/frontal-settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
            setSaving(false);
            if (r.ok) {
              setSaved(body);
              setDefaults(body);
            }
            setMessage(r.ok ? { ok: true, text: "נשמר. ימים חדשים יקבלו את הנוסח הזה." } : { ok: false, text: r.error });
          }}
        >
          {saving ? "שומר…" : "שמירה"}
        </button>
      </section>

      <section className={card} aria-labelledby="fields-h">
        <h3 id="fields-h" className="text-lg font-semibold">שדות דוח הסיום</h3>
        <p className="mb-4 mt-1 text-sm text-[var(--color-text-muted)]">מה המדריך ממלא בסוף היום. הדוח נשלח אל המקום אחרי שאתם מאשרים אותו.</p>
        <ReportFields />
      </section>
    </div>
  );
}
