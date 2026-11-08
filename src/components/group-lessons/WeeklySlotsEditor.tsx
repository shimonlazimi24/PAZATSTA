"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

type Slot = { id?: string; weekday: number; startTime: string; endTime: string; location: string; teachersNeeded: number; active: boolean };

const inputCls = "min-h-[40px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-2 text-sm";

/**
 * The fixed weekly group lessons (e.g. every Sunday and Tuesday). Saving creates
 * the lessons through the end of next month; after that the daily run keeps
 * adding them. The admin then only picks each lesson's topic in the list below.
 */
export function WeeklySlotsEditor({ onSaved }: { onSaved: () => void }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiJson<(Slot & { location: string | null })[]>("/api/admin/group-lessons/schedule").then((r) => {
      const list = r.ok ? r.data.map((s) => ({ ...s, location: s.location ?? "" })) : [];
      setSlots(list);
      if (list.length === 0) setOpen(true);
    });
  }, []);

  function update(i: number, patch: Partial<Slot>) {
    setSlots((prev) => prev!.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    setMsg(null);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const r = await apiJson<{ created: number }>("/api/admin/group-lessons/schedule", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error || "השמירה נכשלה" });
    setMsg({ ok: true, text: r.data.created ? `נשמר. נוצרו ${r.data.created} שיעורים חדשים.` : "נשמר." });
    const fresh = await apiJson<(Slot & { location: string | null })[]>("/api/admin/group-lessons/schedule");
    if (fresh.ok) setSlots(fresh.data.map((s) => ({ ...s, location: s.location ?? "" })));
    onSaved();
  }

  if (!slots) return null;
  const summary = slots.filter((s) => s.active).map((s) => `${WEEKDAYS[s.weekday]} ${s.startTime}`).join(" · ");

  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="font-semibold text-[var(--color-text)]">שיעורים קבועים כל שבוע</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {summary
              ? `${summary}. השיעורים נוצרים לבד עד סוף החודש הבא, ונשאר רק לבחור נושא לכל תאריך ברשימה.`
              : "קבעו פעם אחת באילו ימים יש שיעור, והשיעורים ייווצרו לבד כל שבוע."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="min-h-[40px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 text-sm font-medium hover:bg-[var(--color-bg-muted)]"
        >
          {open ? "סגירה" : "עריכה"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          {slots.map((s, i) => (
            <div key={s.id ?? `new${i}`} className="flex flex-wrap items-end gap-2 rounded-md bg-[var(--color-bg-muted)]/50 p-3">
              <label className="text-sm">
                <span className="mb-1 block text-[var(--color-text-muted)]">יום</span>
                <select className={inputCls} value={s.weekday} onChange={(e) => update(i, { weekday: Number(e.target.value) })}>
                  {WEEKDAYS.map((d, n) => (
                    <option key={d} value={n}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--color-text-muted)]">משעה</span>
                <input type="time" className={inputCls} value={s.startTime} onChange={(e) => update(i, { startTime: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--color-text-muted)]">עד שעה</span>
                <input type="time" className={inputCls} value={s.endTime} onChange={(e) => update(i, { endTime: e.target.value })} />
              </label>
              <label className="min-w-[10rem] flex-1 text-sm">
                <span className="mb-1 block text-[var(--color-text-muted)]">מקום או קישור</span>
                <input className={`${inputCls} w-full`} value={s.location} onChange={(e) => update(i, { location: e.target.value })} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-[var(--color-text-muted)]">מורים</span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  className={`${inputCls} w-20`}
                  value={s.teachersNeeded}
                  onChange={(e) => update(i, { teachersNeeded: Number(e.target.value) })}
                />
              </label>
              <label className="flex min-h-[40px] items-center gap-2 text-sm">
                <input type="checkbox" checked={s.active} onChange={(e) => update(i, { active: e.target.checked })} />
                פעיל
              </label>
              <button
                type="button"
                onClick={() => setSlots((prev) => prev!.filter((_, j) => j !== i))}
                className="min-h-[40px] rounded-[var(--radius-input)] px-3 text-sm text-red-700 hover:bg-red-50"
              >
                הסרה
              </button>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSlots((prev) => [...prev!, { weekday: prev!.length ? 2 : 0, startTime: "17:00", endTime: "18:30", location: "", teachersNeeded: 1, active: true }])
              }
              className="min-h-[40px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 text-sm font-medium hover:bg-[var(--color-bg-muted)]"
            >
              הוספת יום קבוע
            </button>
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="min-h-[40px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "שומר…" : "שמירה ויצירת השיעורים"}
            </button>
            {msg && (
              <span className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`} role={msg.ok ? "status" : "alert"}>
                {msg.text}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            שיעור שיוצא בחג: פותחים אותו ברשימה ומבטלים או משנים שעה. הוא לא ייווצר מחדש.
          </p>
        </div>
      )}
    </section>
  );
}
