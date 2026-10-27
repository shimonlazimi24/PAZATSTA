"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiJson } from "@/lib/api";

type LessonType = { id: string; category: string; name: string; sortOrder: number; active: boolean; lessonCount: number };

const input = "min-h-[40px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-3";

function TypeRow({ t, onSaved }: { t: LessonType; onSaved: (msg: string | null, err?: string) => void }) {
  const [name, setName] = useState(t.name);
  const [busy, setBusy] = useState(false);
  const dirty = name.trim() !== t.name;

  async function patch(body: Record<string, unknown>, done: string) {
    setBusy(true);
    const r = await apiJson(`/api/admin/group-lesson-types/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (r.ok) onSaved(done);
    else onSaved(null, r.error);
  }

  return (
    <li className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center ${t.active ? "" : "opacity-60"}`}>
      <label className="sr-only" htmlFor={`type-${t.id}`}>שם הסוג</label>
      <input id={`type-${t.id}`} className={`${input} flex-1`} value={name} onChange={(e) => setName(e.target.value)} />
      <span className="text-xs text-[var(--color-text-muted)] sm:w-24">
        {t.lessonCount === 0 ? "אין שיעורים" : t.lessonCount === 1 ? "שיעור אחד" : `${t.lessonCount} שיעורים`}
      </span>
      <div className="flex gap-2">
        {dirty && (
          <button type="button" disabled={busy} onClick={() => patch({ name: name.trim() }, "השם עודכן.")} className="min-h-[40px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm text-white disabled:opacity-50">
            שמירה
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ active: !t.active }, t.active ? "הסוג הוסתר משיעורים חדשים." : "הסוג זמין שוב.")}
          className="min-h-[40px] rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 text-sm hover:bg-[var(--color-bg-muted)] disabled:opacity-50"
        >
          {t.active ? "הסתרה" : "החזרה"}
        </button>
      </div>
    </li>
  );
}

export function GroupLessonTypesManager() {
  const [types, setTypes] = useState<LessonType[] | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    const r = await apiJson<LessonType[]>("/api/admin/group-lesson-types");
    setTypes(r.ok ? r.data : []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => Array.from(new Set((types ?? []).map((t) => t.category))), [types]);
  const grouped = useMemo(() => categories.map((c) => [c, (types ?? []).filter((t) => t.category === c)] as const), [categories, types]);

  function saved(msg: string | null, err?: string) {
    setMessage(err ? { ok: false, text: err } : { ok: true, text: msg ?? "" });
    load();
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const cat = category === "__new" ? newCategory.trim() : category;
    const r = await apiJson("/api/admin/group-lesson-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: cat, name: name.trim() }),
    });
    if (!r.ok) {
      setMessage({ ok: false, text: r.error });
      return;
    }
    setName("");
    setNewCategory("");
    if (category === "__new") setCategory(cat);
    saved(`"${name.trim()}" נוסף ל${cat}.`);
  }

  if (!types) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;

  return (
    <div className="space-y-6">
      {message && (
        <p className={`rounded-[var(--radius-input)] px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}

      <form onSubmit={add} className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
        <h3 className="font-semibold text-[var(--color-text)]">הוספת סוג שיעור</h3>
        <div className="grid gap-3 sm:grid-cols-[12rem_1fr_auto]">
          <div>
            <label htmlFor="nt-cat" className="mb-1 block text-sm">קטגוריה</label>
            <select id="nt-cat" className={`${input} w-full`} value={category} onChange={(e) => setCategory(e.target.value)} required>
              <option value="">בחרו קטגוריה</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__new">קטגוריה חדשה…</option>
            </select>
          </div>
          <div>
            <label htmlFor="nt-name" className="mb-1 block text-sm">שם הסוג</label>
            <input id="nt-name" className={`${input} w-full`} value={name} onChange={(e) => setName(e.target.value)} placeholder="לדוגמה: שיחה אישית" required />
          </div>
          <button type="submit" className="min-h-[40px] self-end rounded-[var(--radius-input)] bg-[var(--color-primary)] px-5 text-sm font-medium text-white">
            הוספה
          </button>
        </div>
        {category === "__new" && (
          <div className="sm:w-72">
            <label htmlFor="nt-newcat" className="mb-1 block text-sm">שם הקטגוריה החדשה</label>
            <input id="nt-newcat" className={`${input} w-full`} value={newCategory} onChange={(e) => setNewCategory(e.target.value)} required />
          </div>
        )}
      </form>

      {grouped.map(([cat, list]) => (
        <section key={cat} className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-5 py-3">
          <h3 className="pt-1 font-semibold text-[var(--color-text)]">{cat}</h3>
          <ul className="divide-y divide-[var(--color-border)]">
            {list.map((t) => (
              <TypeRow key={`${t.id}-${t.name}-${t.active}`} t={t} onSaved={saved} />
            ))}
          </ul>
        </section>
      ))}
      <p className="text-sm text-[var(--color-text-muted)]">
        סוג שהוסתר לא יופיע בשיעורים חדשים, אבל שיעורים ודוחות קיימים שומרים עליו. כך אפשר לשנות את הרשימה בלי לפגוע בהיסטוריה.
      </p>
    </div>
  );
}
