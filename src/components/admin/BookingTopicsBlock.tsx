"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/api";
import { TOPIC_CATEGORIES } from "@/lib/booking-topics";

type Row = { id: string; category: string; label: string; active: boolean; teachers: number };
type Cat = { id: string; title: string; active: boolean };

const inputCls = "min-h-[44px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3 text-sm";

/**
 * Topics the admin adds to the booking form. The built-in topics stay in the
 * code; these are shown alongside them, under the chosen category. A topic is
 * hidden rather than deleted, so lessons already booked on it keep their name.
 */
export function BookingTopicsBlock() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [newCat, setNewCat] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function load() {
    apiJson<{ topics: Row[]; categories: Cat[] }>("/api/admin/booking-topics").then((r) => {
      setRows(r.ok ? r.data.topics : []);
      setCats(r.ok ? r.data.categories : []);
    });
  }
  useEffect(load, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || busy) return;
    setBusy(true);
    setMsg(null);
    const r = await apiJson("/api/admin/booking-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, label }),
    });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error || "ההוספה נכשלה" });
    setLabel("");
    setMsg({ ok: true, text: "הנושא נוסף. עכשיו סמנו אותו כהתמחות אצל המורים שמלמדים אותו, כדי שתלמידים יוכלו לקבוע שיעור." });
    load();
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!newCat.trim()) return;
    setMsg(null);
    const r = await apiJson<{ categoryId: string }>("/api/admin/booking-topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newCategory: newCat }),
    });
    if (!r.ok) return setMsg({ ok: false, text: r.error || "ההוספה נכשלה" });
    setNewCat("");
    setCategory(r.data.categoryId);
    setMsg({ ok: true, text: "הכרטיס נוצר. עכשיו הוסיפו לו נושאים למטה: הוא יופיע לתלמידים רק כשיש בו נושא אחד לפחות." });
    load();
  }

  async function patchCard(categoryId: string, data: { active?: boolean; title?: string }) {
    setMsg(null);
    const r = await apiJson("/api/admin/booking-topics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, ...data }),
    });
    if (!r.ok) setMsg({ ok: false, text: r.error || "השמירה נכשלה" });
    load();
  }

  const titleOf = (id: string) => TOPIC_CATEGORIES.find((c) => c.id === id)?.title ?? cats.find((c) => c.id === id)?.title ?? id;

  async function patch(id: string, data: Partial<Pick<Row, "active" | "label">>) {
    setMsg(null);
    const r = await apiJson("/api/admin/booking-topics", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (!r.ok) setMsg({ ok: false, text: r.error || "השמירה נכשלה" });
    load();
  }

  return (
    <div className="space-y-6" dir="rtl">
      <form onSubmit={addCard} className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
        <h3 className="font-semibold text-[var(--color-text)]">כרטיס חדש (מסלול)</h3>
        <p className="text-sm text-[var(--color-text-muted)]">
          כרטיס הוא מה שתלמיד רואה בשלב הראשון, כמו &quot;הכנה לצו ראשון&quot; או &quot;הכנה לקורס טיס&quot;. בתוך כל כרטיס יש נושאים.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[14rem] flex-1 text-sm">
            <span className="mb-1 block text-[var(--color-text-muted)]">שם הכרטיס</span>
            <input className={`${inputCls} w-full`} value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="למשל: הכנה לגיבושים" maxLength={60} />
          </label>
          <button
            type="submit"
            disabled={!newCat.trim()}
            className="min-h-[44px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 text-sm font-medium hover:bg-[var(--color-bg-muted)] disabled:opacity-50"
          >
            יצירת כרטיס
          </button>
        </div>
        {cats.length > 0 && (
          <ul className="divide-y divide-[var(--color-border)] border-t border-[var(--color-border)]">
            {cats.map((c) => {
              const count = (rows ?? []).filter((r) => r.category === c.id && r.active).length;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className={`block font-medium ${c.active ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)] line-through"}`}>{c.title}</span>
                    <span className={`block text-sm ${c.active && count === 0 ? "text-amber-800" : "text-[var(--color-text-muted)]"}`}>
                      {count === 0 ? "אין בו נושאים, לא מופיע לתלמידים" : count === 1 ? "נושא אחד" : `${count} נושאים`}
                    </span>
                  </span>
                  <span className="flex gap-3">
                    <button
                      type="button"
                      className="text-sm text-[var(--color-text-muted)] underline-offset-2 hover:underline"
                      onClick={() => {
                        const next = prompt("שם חדש לכרטיס:", c.title)?.trim();
                        if (next && next !== c.title) patchCard(c.id, { title: next });
                      }}
                    >
                      שינוי שם
                    </button>
                    <button type="button" className="text-sm text-[var(--color-text-muted)] underline-offset-2 hover:underline" onClick={() => patchCard(c.id, { active: !c.active })}>
                      {c.active ? "הסתרה" : "החזרה"}
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </form>

      <form onSubmit={add} className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
        <h3 className="font-semibold text-[var(--color-text)]">הוספת נושא לכרטיס</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-[var(--color-text-muted)]">כרטיס</span>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
              {[...TOPIC_CATEGORIES, ...cats].map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[14rem] flex-1 text-sm">
            <span className="mb-1 block text-[var(--color-text-muted)]">שם הנושא, כמו שתלמידים יראו אותו</span>
            <input className={`${inputCls} w-full`} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="למשל: צנחנים - יום גיבוש" maxLength={120} />
          </label>
          <button
            type="submit"
            disabled={busy || !label.trim()}
            className="min-h-[44px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "מוסיף…" : "הוספה"}
          </button>
        </div>
        {msg && (
          <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`} role={msg.ok ? "status" : "alert"}>
            {msg.text}
          </p>
        )}
      </form>

      <section className="space-y-2">
        <h3 className="font-semibold text-[var(--color-text)]">נושאים שהוספתם</h3>
        {rows === null ? (
          <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">עוד לא הוספתם נושאים. הנושאים הקבועים של המערכת ממשיכים להופיע כרגיל.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className={`block font-medium ${r.active ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)] line-through"}`}>{r.label}</span>
                  <span className={`block text-sm ${r.active && r.teachers === 0 ? "text-amber-800" : "text-[var(--color-text-muted)]"}`}>
                    {titleOf(r.category)} ·{" "}
                    {r.teachers === 0 ? "אף מורה לא מסומן, תלמידים לא יוכלו לקבוע" : r.teachers === 1 ? "מורה אחד" : `${r.teachers} מורים`}
                  </span>
                </span>
                <span className="flex gap-3">
                  <button
                    type="button"
                    className="text-sm text-[var(--color-text-muted)] underline-offset-2 hover:underline"
                    onClick={() => {
                      const next = prompt("שם חדש לנושא:", r.label)?.trim();
                      if (next && next !== r.label) patch(r.id, { label: next });
                    }}
                  >
                    שינוי שם
                  </button>
                  <button type="button" className="text-sm text-[var(--color-text-muted)] underline-offset-2 hover:underline" onClick={() => patch(r.id, { active: !r.active })}>
                    {r.active ? "הסתרה" : "החזרה"}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
