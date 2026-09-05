"use client";

import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  /** Helper text shown under the field. */
  hint?: string;
  /** Render as a fixed value the user cannot edit. */
  readOnly?: boolean;
  className?: string;
}

export function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  error,
  hint,
  readOnly,
  className,
}: FormFieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("text-right", className)}>
      <label htmlFor={name} className="block text-sm font-medium text-[var(--color-text)] mb-1">
        {label}
        {required && !readOnly && <span className="text-[var(--color-primary)]"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required && !readOnly}
        readOnly={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "w-full rounded-[var(--radius-input)] border border-[var(--color-border)] px-4 py-3 text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:border-transparent",
          readOnly
            ? "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] cursor-default"
            : "bg-white",
          error && "border-red-500"
        )}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-[var(--color-text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
