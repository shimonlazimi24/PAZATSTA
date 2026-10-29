"use client";

import { useRef } from "react";
import { PLACEHOLDERS, renderTemplate, unknownPlaceholders, type TemplateValues } from "@/lib/frontal-days";

const SAMPLE: TemplateValues = {
  שם_המורה: "דנה",
  כותרת: "תיכון אורט רמת גן",
  תאריך: "יום חמישי, 12 בנובמבר",
  שעות: "08:30–13:00",
  כתובת: "הרצל 1, רמת גן",
  וויז: "https://waze.com/ul?q=...",
  נושא: "הכנה ליום המאה",
  מצגת: "https://drive.google.com/...",
  איש_קשר: "רונית",
  טלפון_איש_קשר: "050-0000000",
  וואטסאפ: "https://chat.whatsapp.com/...",
};

/**
 * A message with {placeholders}: buttons insert a placeholder at the cursor, and
 * the preview shows the message as a teacher will get it (with sample values,
 * or the day's real values when given).
 */
export function TemplateEditor({
  id,
  label,
  value,
  onChange,
  values,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  values?: Partial<TemplateValues>;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const unknown = unknownPlaceholders(value);

  function insert(key: string) {
    const el = ref.current;
    const token = `{${key}}`;
    if (!el) return onChange(value + token);
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor={id} className="block text-sm font-medium text-[var(--color-text)]">{label}</label>
        <textarea
          ref={ref}
          id={id}
          rows={14}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 py-2 text-right leading-relaxed"
        />
        <div>
          <p className="mb-1 text-xs text-[var(--color-text-muted)]">הוספת פרט מהיום (שורה שהפרט שלה ריק לא תישלח):</p>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDERS.map((p) => (
              <button
                key={p.key}
                type="button"
                title={p.help}
                onClick={() => insert(p.key)}
                className="rounded-full border border-[var(--color-border)] bg-white px-2.5 py-1 text-xs text-[var(--color-text)] hover:border-[var(--color-primary)]"
              >
                {p.key.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
        {unknown.length > 0 && (
          <p className="text-sm text-amber-800" role="alert">
            לא מוכר: {unknown.map((u) => `{${u}}`).join(", ")}. בדקו את האיות, או הוסיפו מהכפתורים.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--color-text)]">כך המורה יקבל את זה</p>
        <div className="min-h-[14rem] whitespace-pre-wrap [overflow-wrap:anywhere] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-bg-muted)]/40 px-4 py-3 text-sm leading-relaxed text-[var(--color-text)]">
          {renderTemplate(value, { ...SAMPLE, ...values })}
        </div>
      </div>
    </div>
  );
}
