"use client";

export type ReportFieldDef = {
  id: string;
  label: string;
  kind: string;
  required: boolean;
  help?: string;
  options?: string[];
};

export type AnswerValue = string | string[];

const text = "w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2";

/** One question of the closing report, rendered by its kind. */
export function ReportFieldInput({
  field,
  value,
  onChange,
}: {
  field: ReportFieldDef;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const id = `rf-${field.id}`;
  const label = (
    <>
      {field.label}
      {!field.required && <span className="font-normal text-[var(--color-text-muted)]"> (רשות)</span>}
    </>
  );
  const help = field.help ? <p className="mb-1.5 text-xs text-[var(--color-text-muted)]">{field.help}</p> : null;
  const str = typeof value === "string" ? value : "";
  const list = Array.isArray(value) ? value : [];

  if (field.kind === "choice" || field.kind === "multi") {
    const multi = field.kind === "multi";
    return (
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-[var(--color-text)]">{label}</legend>
        {help}
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => {
            const checked = multi ? list.includes(opt) : str === opt;
            return (
              <label
                key={opt}
                className={`inline-flex min-h-[36px] cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${
                  checked ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 font-medium" : "border-[var(--color-border)] bg-white"
                }`}
              >
                <input
                  type={multi ? "checkbox" : "radio"}
                  name={id}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                  checked={checked}
                  onChange={() => onChange(multi ? (checked ? list.filter((x) => x !== opt) : [...list, opt]) : opt)}
                />
                {opt}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-[var(--color-text)]">
        {label}
      </label>
      {help}
      {field.kind === "long" ? (
        <textarea id={id} rows={4} maxLength={4000} className={`${text} resize-y`} value={str} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          id={id}
          type={field.kind === "number" ? "number" : field.kind === "date" ? "date" : "text"}
          inputMode={field.kind === "number" ? "numeric" : undefined}
          min={field.kind === "number" ? 0 : undefined}
          className={`${text} min-h-[40px] ${field.kind === "number" || field.kind === "date" ? "w-48" : ""}`}
          value={str}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
