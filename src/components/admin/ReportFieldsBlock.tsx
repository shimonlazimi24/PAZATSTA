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

  useEffect(() => {
    apiJson<ReportField[]>("/api/admin/report-fields").then((r) => {
      if (r.ok) setFields(r.data);
      else setLoadError(r.error);
    });
  }, []);

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
        הניסוח של שדות דוח הסיכום, כפי שהמורה רואה אותם בטופס. הכותרות בקובץ ה-PDF
        נשארות קבועות, כדי שדוח שכבר נשלח להורה לא ישתנה למפרע.
      </p>

      <form onSubmit={save} className="space-y-4">
        {fields.map((field) => (
          <Card key={field.key}>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-bold text-[var(--color-text)]">{field.label || field.key}</h3>
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
    </div>
  );
}
