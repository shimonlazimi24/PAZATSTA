"use client";

import { useCallback, useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import { TemplateEditor } from "./TemplateEditor";
import { ChecklistEditor } from "./ChecklistEditor";

type Defaults = { messageTemplate: string; reminderTemplate: string; checklist: string[] };
type Kind = "short" | "long" | "number" | "date" | "choice" | "multi";
type Field = {
  id: string;
  label: string;
  kind: Kind;
  required: boolean;
  sortOrder: number;
  active: boolean;
  help: string;
  options: string[];
  showIfFieldId: string | null;
  showIfValues: string[];
  internal: boolean;
};

const KIND_LABEL: Record<Kind, string> = {
  short: "שורה אחת",
  long: "טקסט חופשי",
  number: "מספר",
  date: "תאריך",
  choice: "בחירה של תשובה אחת",
  multi: "בחירה של כמה תשובות",
};
const card = "rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5";
const input = "min-h-[40px] rounded-md border border-[var(--color-border)] bg-white px-3";

function Status({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p className={`rounded-md px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
      {message.text}
    </p>
  );
}

const EMPTY_DRAFT = { label: "", kind: "long" as Kind, required: true, help: "", optionsText: "", internal: false, showIfFieldId: "", showIfValues: [] as string[] };

function ReportFields({ form = "report" }: { form?: "report" | "survey" }) {
  const survey = form === "survey";
  const where = survey ? "לסקר" : "לדוח";
  const [fields, setFields] = useState<Field[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const load = useCallback(async () => {
    const r = await apiJson<Field[]>(`/api/admin/frontal-report-fields?form=${form}`);
    setFields(r.ok ? r.data : []);
  }, [form]);
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
  const labelOf = new Map(fields.map((f) => [f.id, f.label]));
  const choiceFields = active.filter((f) => f.kind === "choice" || f.kind === "multi");
  const parent = choiceFields.find((f) => f.id === draft.showIfFieldId);
  const needsOptions = draft.kind === "choice" || draft.kind === "multi";

  return (
    <div className="space-y-4">
      <Status message={message} />
      {!survey && (
        <p className="text-sm text-[var(--color-text-muted)]">
          שם המדריך, המיקום והתאריך נוספים לדוח אוטומטית, ולא צריך לשאול עליהם.
        </p>
      )}
      <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
        {active.map((f, i) => (
          <li key={f.id} className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-start ${f.showIfFieldId ? "pr-6" : ""}`}>
            <span className="w-6 pt-0.5 text-sm tabular-nums text-[var(--color-text-muted)]">{f.showIfFieldId ? "" : i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{f.label}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {KIND_LABEL[f.kind] ?? f.kind}, {f.required ? "חובה" : "רשות"}
                {f.options.length > 0 && `: ${f.options.join(" / ")}`}
              </p>
              {f.showIfFieldId && (
                <p className="text-xs text-[var(--color-text-muted)]">
                  מופיע רק אם ב&quot;{labelOf.get(f.showIfFieldId) ?? "שאלה שהוסרה"}&quot; נבחר: {f.showIfValues.join(" או ")}
                </p>
              )}
              {f.internal && <p className="mt-0.5 text-xs font-medium text-amber-800">פנימי: לא נשלח לבית הספר</p>}
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
              <button type="button" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]" onClick={() => patch(f, { required: !f.required }, f.required ? "השאלה הפכה לרשות." : "השאלה הפכה לחובה.")}>
                {f.required ? "להפוך לרשות" : "להפוך לחובה"}
              </button>
              {!survey && (
                <button type="button" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]" onClick={() => patch(f, { internal: !f.internal }, f.internal ? "התשובה תישלח גם לבית הספר." : "התשובה תישאר פנימית.")}>
                  {f.internal ? "לשלוח גם לבית הספר" : "להשאיר פנימי"}
                </button>
              )}
              <button type="button" className="text-red-700 hover:underline" onClick={() => patch(f, { active: false }, `"${f.label}" הוסרה ${survey ? "מהסקר" : "מהדוח"}.`)}>
                הסרה
              </button>
            </div>
          </li>
        ))}
      </ol>

      <form
        className="space-y-3 rounded-md bg-[var(--color-bg-muted)] p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const options = draft.optionsText.split("\n").map((x) => x.trim()).filter(Boolean);
          const body = {
            label: draft.label,
            kind: draft.kind,
            required: draft.required,
            help: draft.help,
            options: needsOptions ? options : [],
            internal: draft.internal,
            showIfFieldId: draft.showIfFieldId || null,
            showIfValues: draft.showIfFieldId ? draft.showIfValues : [],
          };
          const r = await apiJson(`/api/admin/frontal-report-fields?form=${form}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!r.ok) return setMessage({ ok: false, text: r.error });
          setMessage({ ok: true, text: `"${draft.label}" נוספה ${where}.` });
          setDraft(EMPTY_DRAFT);
          load();
        }}
      >
        <p className="text-sm font-semibold">שאלה חדשה</p>
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <div>
            <label htmlFor={`${form}-nf-label`} className="mb-1 block text-sm">השאלה</label>
            <input id={`${form}-nf-label`} className={`${input} w-full`} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
          </div>
          <div>
            <label htmlFor={`${form}-nf-kind`} className="mb-1 block text-sm">סוג התשובה</label>
            <select id={`${form}-nf-kind`} className={`${input} w-full`} value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })}>
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </div>
        </div>
        {needsOptions && (
          <div>
            <label htmlFor={`${form}-nf-options`} className="mb-1 block text-sm">האפשרויות, אחת בכל שורה</label>
            <textarea id={`${form}-nf-options`} rows={4} className={`${input} w-full py-2`} value={draft.optionsText} onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })} />
          </div>
        )}
        <div>
          <label htmlFor={`${form}-nf-help`} className="mb-1 block text-sm">הסבר קצר מתחת לשאלה (רשות)</label>
          <input id={`${form}-nf-help`} className={`${input} w-full`} value={draft.help} onChange={(e) => setDraft({ ...draft, help: e.target.value })} />
        </div>
        {choiceFields.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${form}-nf-parent`} className="mb-1 block text-sm">להציג רק אחרי תשובה מסוימת (רשות)</label>
              <select id={`${form}-nf-parent`} className={`${input} w-full`} value={draft.showIfFieldId} onChange={(e) => setDraft({ ...draft, showIfFieldId: e.target.value, showIfValues: [] })}>
                <option value="">תמיד להציג</option>
                {choiceFields.map((f) => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
            {parent && (
              <fieldset>
                <legend className="mb-1 text-sm">כשנבחר:</legend>
                <div className="flex flex-wrap gap-2">
                  {parent.options.map((o) => (
                    <label key={o} className="inline-flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.showIfValues.includes(o)}
                        onChange={(e) => setDraft({ ...draft, showIfValues: e.target.checked ? [...draft.showIfValues, o] : draft.showIfValues.filter((x) => x !== o) })}
                      />
                      {o}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} />
            חובה
          </label>
          {!survey && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.internal} onChange={(e) => setDraft({ ...draft, internal: e.target.checked })} />
              פנימי, לא לשלוח לבית הספר
            </label>
          )}
          <button type="submit" disabled={!draft.label.trim() || (draft.showIfFieldId !== "" && draft.showIfValues.length === 0)} className="min-h-[36px] rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-white disabled:opacity-50">
            הוספת השאלה
          </button>
        </div>
      </form>

      {hidden.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-[var(--color-text-muted)]">שאלות שהוסרו ({hidden.length})</summary>
          <ul className="mt-2 space-y-1">
            {hidden.map((f) => (
              <li key={f.id} className="flex justify-between gap-2">
                <span>{f.label}</span>
                <button type="button" className="text-[var(--color-primary)] underline" onClick={() => patch(f, { active: true }, `"${f.label}" חזרה ${where}.`)}>
                  החזרה
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
      <p className="text-xs text-[var(--color-text-muted)]">
        {survey ? "תשובות שכבר נשלחו נשמרות כפי שנשלחו, גם אם משנים כאן את השאלות." : "דוחות שכבר הוגשו נשמרים כפי שהוגשו, גם אם משנים כאן את השאלות."}
      </p>
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

      <section className={card} aria-labelledby="survey-fields-h">
        <h3 id="survey-fields-h" className="text-lg font-semibold">שאלות סקר המשוב לתלמידים</h3>
        <p className="mb-4 mt-1 text-sm text-[var(--color-text-muted)]">
          מה התלמידים עונים בסוף היום, אחרי שסורקים את ה-QR. בלי התחברות, וכל טלפון נספר פעם אחת. אותן שאלות לכל הימים.
        </p>
        <ReportFields form="survey" />
      </section>
    </div>
  );
}
