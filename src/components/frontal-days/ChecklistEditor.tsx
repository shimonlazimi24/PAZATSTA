"use client";

import { useState } from "react";

/** Edit the preparation checklist: rename, remove, move up, add. */
export function ChecklistEditor({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const set = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  const move = (i: number) => {
    if (i === 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-center text-sm tabular-nums text-[var(--color-text-muted)]">{i + 1}</span>
            <label className="sr-only" htmlFor={`cl-${i}`}>סעיף {i + 1}</label>
            <input
              id={`cl-${i}`}
              value={item}
              onChange={(e) => set(i, e.target.value)}
              className="min-h-[40px] flex-1 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3"
            />
            <button type="button" onClick={() => move(i)} disabled={i === 0} className="min-h-[40px] rounded-[var(--radius-input)] px-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] disabled:opacity-30" aria-label={`להעביר את סעיף ${i + 1} למעלה`}>
              למעלה
            </button>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="min-h-[40px] rounded-[var(--radius-input)] px-2 text-sm text-red-700 hover:underline" aria-label={`למחוק את סעיף ${i + 1}`}>
              מחיקה
            </button>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="cl-new">סעיף חדש</label>
        <input
          id="cl-new"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && draft.trim()) {
              e.preventDefault();
              onChange([...items, draft.trim()]);
              setDraft("");
            }
          }}
          placeholder="סעיף חדש, למשל: הדפסתי דפי עבודה"
          className="min-h-[40px] flex-1 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3"
        />
        <button
          type="button"
          disabled={!draft.trim()}
          onClick={() => {
            onChange([...items, draft.trim()]);
            setDraft("");
          }}
          className="min-h-[40px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 text-sm disabled:opacity-50"
        >
          הוספה
        </button>
      </div>
    </div>
  );
}
