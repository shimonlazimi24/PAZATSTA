"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/design/Card";
import { Button } from "@/components/design/Button";
import { FormField } from "@/components/design/FormField";
import { apiJson } from "@/lib/api";
import type { ReportField } from "@/lib/report-template";

const fieldClass =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2 text-right min-h-[44px]";

export function ReportFieldsBlock() {
  const [fields, setFields] = useState<ReportField[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newRequired, setNewRequired] = useState(false);
  const [adding, setAdding] = useState(false);

  function reload() {
    apiJson<ReportField[]>("/api/admin/report-fields").then((r) => {
      if (r.ok) setFields(r.data);
      else setLoadError(r.error);
    });
  }
  useEffect(reload, []);

  async function addQuestion() {
    if (!newLabel.trim()) return;
    setAdding(true);
    const r = await apiJson("/api/admin/report-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim(), isRequired: newRequired }),
    });
    setAdding(false);
    if (!r.ok) return setMessage({ type: "err", text: r.error });
    setNewLabel("");
    setNewRequired(false);
    setMessage({ type: "ok", text: "השאלה נוספה לטופס" });
    reload();
  }

  async function removeQuestion(key: string, label: string) {
    if (!confirm(`למחוק את השאלה "${label}"? דוחות שכבר נשלחו ישמרו את התשובה.`)) return;
    const r = await apiJson(`/api/admin/report-fields?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    if (!r.ok) return setMessage({ type: "err", text: r.error });
    setMessage({ type: "ok", text: "השאלה נמחקה" });
    reload();
  }

  function update(key: string, patch: Partial<ReportField>) {
    setMessage(null);
    setFields((prev) => prev?.map((f) => (f.key === key ? { ...f, ...patch } : f)) ?? prev);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!fields) return;
    if (fields.some((f) => !f.label.trim())) {
      setMessage({ type: "err", text: "לכל שדה נדרשת כותרת" });
      return;
    }
    setSaving(true);
    const result = await apiJson("/api/admin/report-fields", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    setSaving(false);
    setMessage(
      result.ok ? { type: "ok", text: "השדות נשמרו" } : { type: "err", text: result.error }
    );
  }

  if (loadError) {
    return (
      <Card>
        <p role="alert" className="text-sm text-red-700">
          {loadError}
        </p>
      </Card>
    );
  }
  if (!fields) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;

  return (
    <div className="space-y-6" dir="rtl">
      <p className="text-sm text-[var(--color-text-muted)]">
        השאלות בטופס הסיכום שהמורה ממלא אחרי שיעור פרטי. אפשר לשנות ניסוח, להסתיר שדה קבוע, ולהוסיף שאלות משלכם
        (בסוף הדף). התשובות לשאלות שהוספתם מופיעות גם ב-PDF שנשלח להורה.
      </p>

      <form onSubmit={save} className="space-y-4">
        {fields.map((field) => (
          <Card key={field.key}>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={`font-bold ${field.active ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)] line-through"}`}>
                  {field.label || field.key}
                  {field.custom && <span className="ms-2 rounded bg-[var(--color-bg-muted)] px-2 py-0.5 text-xs font-normal no-underline">שאלה שהוספתם</span>}
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                {field.key !== "summaryText" && !field.custom && (
                  <label className="flex items-center gap-2 text-sm text-[var(--color-text)] shrink-0">
                    <input
                      type="checkbox"
                      checked={field.active}
                      onChange={(e) => update(field.key, { active: e.target.checked })}
                      className="rounded border-[var(--color-border)]"
                    />
                    מוצג בטופס
                  </label>
                )}
                {field.custom && (
                  <button type="button" onClick={() => removeQuestion(field.key, field.label)} className="text-sm text-red-700 underline-offset-2 hover:underline">
                    מחיקת השאלה
                  </button>
                )}
                <label className="flex items-center gap-2 text-sm text-[var(--color-text)] shrink-0">
                  <input
                    type="checkbox"
                    checked={field.isRequired}
                    disabled={field.key === "tips"}
                    onChange={(e) => update(field.key, { isRequired: e.target.checked })}
                    className="rounded border-[var(--color-border)]"
                  />
                  שדה חובה
                </label>
                </div>
              </div>
              {field.key === "tips" && (
                <p className="text-sm text-[var(--color-text-muted)]">
                  שדה הטיפים לא יכול להיות חובה — הוא מסומן מרשימה או נכתב כמלל חופשי.
                </p>
              )}
              <FormField
                label="כותרת"
                name={`${field.key}-label`}
                value={field.label}
                onChange={(v) => update(field.key, { label: v })}
                required
              />
              <FormField
                label="הסבר"
                name={`${field.key}-help`}
                value={field.helpText}
                onChange={(v) => update(field.key, { helpText: v })}
                hint="טקסט הסבר קצר שמופיע מתחת לכותרת"
              />
              {field.key !== "tips" && (
                <div className="text-right">
                  <label htmlFor={`${field.key}-ph`} className="block text-sm font-medium mb-1">
                    טקסט מקדים
                  </label>
                  <input
                    id={`${field.key}-ph`}
                    value={field.placeholder}
                    onChange={(e) => update(field.key, { placeholder: e.target.value })}
                    className={fieldClass}
                    placeholder="מה שמופיע בתיבה הריקה"
                  />
                </div>
              )}
            </div>
          </Card>
        ))}

        {message && (
          <p
            role={message.type === "err" ? "alert" : "status"}
            className={
              message.type === "ok"
                ? "text-sm text-green-700 bg-green-50 border border-green-200 rounded-[var(--radius-input)] px-3 py-2"
                : "text-sm text-red-700 bg-red-50 border border-red-200 rounded-[var(--radius-input)] px-3 py-2"
            }
          >
            {message.text}
          </p>
        )}

        <Button type="submit" disabled={saving}>
          {saving ? "שומר…" : "שמירת השדות"}
        </Button>
      </form>

      <Card>
        <div className="space-y-3">
          <h3 className="font-bold text-[var(--color-text)]">הוספת שאלה לטופס</h3>
          <FormField
            label="השאלה"
            name="new-question"
            value={newLabel}
            onChange={setNewLabel}
            hint="למשל: איך התלמיד הגיע מוכן לשיעור? המורה עונה במלל חופשי."
          />
          <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} className="rounded border-[var(--color-border)]" />
            שדה חובה
          </label>
          <Button type="button" onClick={addQuestion} disabled={adding || !newLabel.trim()}>
            {adding ? "מוסיף…" : "הוספת השאלה"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
