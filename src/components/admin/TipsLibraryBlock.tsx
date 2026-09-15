"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/design/Card";
import { Button } from "@/components/design/Button";
import { FormField } from "@/components/design/FormField";
import { apiJson } from "@/lib/api";
import { ALL_LESSON_TOPIC_LABELS } from "@/data/topics";
import { normalizeTopicKey } from "@/lib/topic-key";

type AdminTip = {
  id: string;
  slug: string;
  label: string;
  text: string;
  groupLabel: string;
  topics: string[];
  sortOrder: number;
  isArchived: boolean;
};

const fieldClass =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2 text-right min-h-[44px]";

const EMPTY = { label: "", text: "", groupLabel: "", topics: [] as string[] };

export function TipsLibraryBlock() {
  const [tips, setTips] = useState<AdminTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  /** The row being edited, or "new" for the create form. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    apiJson<AdminTip[]>("/api/admin/tips")
      .then((r) => {
        if (r.ok) setTips(r.data);
        else setLoadError(r.error);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  function startCreate() {
    setEditing("new");
    setDraft(EMPTY);
    setMessage(null);
  }

  function startEdit(tip: AdminTip) {
    setEditing(tip.id);
    // Stored topics are normalized keys; map them back to display labels.
    setDraft({
      label: tip.label,
      text: tip.text,
      groupLabel: tip.groupLabel,
      topics: ALL_LESSON_TOPIC_LABELS.filter((l) => tip.topics.includes(normalizeTopicKey(l))),
    });
    setMessage(null);
  }

  function toggleTopic(label: string) {
    setDraft((d) => ({
      ...d,
      topics: d.topics.includes(label)
        ? d.topics.filter((t) => t !== label)
        : [...d.topics, label],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.label.trim() || !draft.text.trim()) {
      setMessage({ type: "err", text: "נדרשים כותרת ותוכן" });
      return;
    }
    setSavingId(editing);
    const isNew = editing === "new";
    const result = await apiJson(isNew ? "/api/admin/tips" : `/api/admin/tips/${editing}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSavingId(null);
    if (!result.ok) {
      setMessage({ type: "err", text: result.error });
      return;
    }
    setMessage({ type: "ok", text: isNew ? "הטיפ נוסף" : "הטיפ עודכן" });
    setEditing(null);
    load();
  }

  async function archive(tip: AdminTip) {
    if (
      !window.confirm(
        `להוציא את "${tip.label}" מהרשימה?\n\n` +
          "הטיפ יפסיק להופיע למורים. דוחות שכבר נכתבו לא ישתנו."
      )
    ) {
      return;
    }
    setSavingId(tip.id);
    const result = await apiJson(`/api/admin/tips/${tip.id}`, { method: "DELETE" });
    setSavingId(null);
    if (!result.ok) setMessage({ type: "err", text: result.error });
    else load();
  }

  /**
   * Move a tip past its neighbour by swapping sortOrder.
   *
   * Order matters beyond presentation: it is the order tips are joined into the
   * snapshot, so a teacher's report reads in the sequence set here.
   */
  async function move(tip: AdminTip, direction: -1 | 1) {
    const ordered = tips.filter((t) => !t.isArchived);
    const index = ordered.findIndex((t) => t.id === tip.id);
    const neighbour = ordered[index + direction];
    if (!neighbour) return;

    setSavingId(tip.id);
    const results = await Promise.all([
      apiJson(`/api/admin/tips/${tip.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: neighbour.sortOrder }),
      }),
      apiJson(`/api/admin/tips/${neighbour.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sortOrder: tip.sortOrder }),
      }),
    ]);
    setSavingId(null);
    const failed = results.find((r) => !r.ok);
    if (failed && !failed.ok) setMessage({ type: "err", text: failed.error });
    load();
  }

  async function restore(tip: AdminTip) {
    setSavingId(tip.id);
    const result = await apiJson(`/api/admin/tips/${tip.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isArchived: false }),
    });
    setSavingId(null);
    if (!result.ok) setMessage({ type: "err", text: result.error });
    else load();
  }

  const visible = tips.filter((t) => showArchived || !t.isArchived);
  const existingGroups = Array.from(
    new Set(tips.map((t) => t.groupLabel.trim()).filter(Boolean))
  ).sort();
  const archivedCount = tips.filter((t) => t.isArchived).length;
  const activeCount = tips.filter((t) => !t.isArchived).length;

  return (
    <div className="space-y-6" dir="rtl">
      <p className="text-sm text-[var(--color-text-muted)]">
        טיפים שהמורה יכול לצרף לדוח הסיכום. טיפ ללא סוגי מיון מוצע בכל שיעור.
        עריכה משפיעה על דוחות עתידיים בלבד — דוחות שכבר נשלחו נשמרים כפי שהם.
      </p>

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

      {editing ? (
        <Card>
          <form onSubmit={save} className="space-y-4">
            <h3 className="font-bold text-[var(--color-text)]">
              {editing === "new" ? "טיפ חדש" : "עריכת טיפ"}
            </h3>
            <FormField
              label="כותרת"
              name="tip-label"
              value={draft.label}
              onChange={(v) => setDraft((d) => ({ ...d, label: v }))}
              required
              hint="מה שהמורה רואה לצד תיבת הסימון"
            />
            <div className="text-right">
              <label htmlFor="tip-group" className="block text-sm font-medium mb-1">
                כותרת קבוצה
              </label>
              <input
                id="tip-group"
                list="tip-group-options"
                value={draft.groupLabel}
                onChange={(e) => setDraft((d) => ({ ...d, groupLabel: e.target.value }))}
                className={fieldClass}
                placeholder="למשל ״צו ראשון - דפר״"
              />
              {/* Existing groups are offered, so a typo does not silently create a
                  second group with almost the same name. */}
              <datalist id="tip-group-options">
                {existingGroups.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                לקיבוץ ויזואלי בלבד במסך של המורה.
              </p>
            </div>
            <div className="text-right">
              <label htmlFor="tip-text" className="block text-sm font-medium mb-1">
                תוכן <span className="text-[var(--color-primary)]">*</span>
              </label>
              <textarea
                id="tip-text"
                value={draft.text}
                onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
                rows={8}
                maxLength={5000}
                className={fieldClass}
                placeholder="הטקסט המלא שייכנס לדוח ולקובץ ה-PDF"
              />
            </div>
            <div className="text-right">
              <p className="block text-sm font-medium mb-1">סוגי מיון</p>
              <p className="text-sm text-[var(--color-text-muted)] mb-2">
                {draft.topics.length === 0
                  ? "לא נבחר אף סוג — הטיפ יוצע בכל שיעור."
                  : `נבחרו ${draft.topics.length} סוגים.`}
              </p>
              <div className="flex flex-wrap gap-2">
                {ALL_LESSON_TOPIC_LABELS.map((label) => {
                  const on = draft.topics.includes(label);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleTopic(label)}
                      aria-pressed={on}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        on
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                          : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:border-[var(--color-primary)]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={savingId !== null}>
                {savingId !== null ? "שומר…" : "שמירה"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
                ביטול
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button type="button" onClick={startCreate}>
          הוספת טיפ
        </Button>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-bold text-[var(--color-text)]">
            טיפים ({visible.length})
          </h3>
          {archivedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              {showArchived ? "הסתר בארכיון" : `הצג ${archivedCount} בארכיון`}
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
        ) : loadError ? (
          <Card>
            <p role="alert" className="text-sm text-red-700">
              {loadError}
            </p>
            <button type="button" onClick={load} className="mt-2 text-sm text-[var(--color-primary)] hover:underline">
              נסו שוב
            </button>
          </Card>
        ) : visible.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-text-muted)]">אין טיפים במערכת.</p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {visible.map((tip, index) => (
              <li key={tip.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--color-text)]">
                        {tip.label}
                        {tip.isArchived && (
                          <span className="mr-2 text-xs text-[var(--color-text-muted)]">(בארכיון)</span>
                        )}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                        {tip.groupLabel || "ללא קבוצה"} ·{" "}
                        {tip.topics.length === 0 ? "כל סוגי המיון" : `${tip.topics.length} סוגי מיון`}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {tip.isArchived ? (
                        <button
                          type="button"
                          onClick={() => restore(tip)}
                          disabled={savingId === tip.id}
                          className="text-sm text-[var(--color-primary)] hover:underline disabled:opacity-50"
                        >
                          שחזור
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => move(tip, -1)}
                            disabled={savingId !== null || index === 0}
                            aria-label={`העברת ${tip.label} למעלה`}
                            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => move(tip, 1)}
                            disabled={savingId !== null || index === activeCount - 1}
                            aria-label={`העברת ${tip.label} למטה`}
                            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(tip)}
                            className="text-sm text-[var(--color-primary)] hover:underline"
                          >
                            עריכה
                          </button>
                          <button
                            type="button"
                            onClick={() => archive(tip)}
                            disabled={savingId === tip.id}
                            className="text-sm text-amber-700 hover:underline disabled:opacity-50"
                          >
                            הוצאה מהרשימה
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
