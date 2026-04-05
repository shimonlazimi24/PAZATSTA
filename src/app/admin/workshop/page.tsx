"use client";

import { useState, useEffect, useCallback } from "react";
import { FormField } from "@/components/design/FormField";
import { Button } from "@/components/design/Button";
import { Card } from "@/components/design/Card";

type TeacherOption = { id: string; name: string | null };

type AdminWorkshopRow = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  topicLabel: string;
  generalDescription: string | null;
  teacherName: string;
  activeBookings: number;
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("he-IL", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminWorkshopPage() {
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [generalDescription, setGeneralDescription] = useState("");
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [workshops, setWorkshops] = useState<AdminWorkshopRow[]>([]);
  const [loadingWorkshops, setLoadingWorkshops] = useState(true);
  const [workshopsLoadError, setWorkshopsLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadWorkshops = useCallback(() => {
    setLoadingWorkshops(true);
    setWorkshopsLoadError(null);
    fetch("/api/admin/workshops", { credentials: "include" })
      .then(async (r) => {
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          const msg =
            typeof (data as { error?: string } | null)?.error === "string"
              ? (data as { error: string }).error
              : r.status === 403
                ? "אין הרשאה לצפות ברשימה. התחברו כאדמין."
                : "שגיאה בטעינת הסדנאות";
          setWorkshopsLoadError(msg);
          setWorkshops([]);
          return;
        }
        if (Array.isArray(data)) setWorkshops(data);
        else setWorkshops([]);
      })
      .catch(() => {
        setWorkshopsLoadError("שגיאת רשת בטעינת הסדנאות");
        setWorkshops([]);
      })
      .finally(() => setLoadingWorkshops(false));
  }, []);

  useEffect(() => {
    loadWorkshops();
  }, [loadWorkshops]);

  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => (r.ok ? r.json() : []))
      .then((list: TeacherOption[]) => {
        if (Array.isArray(list)) setTeachers(list);
      })
      .catch(() => setTeachers([]))
      .finally(() => setLoadingTeachers(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const max = parseInt(maxParticipants, 10);
    if (!name.trim() || !date || !teacherId || !Number.isFinite(max) || max < 1) {
      setMessage({ type: "err", text: "נא למלא את כל השדות (מספר משתתפים חיובי)" });
      return;
    }
    if (!startTime || !endTime) {
      setMessage({ type: "err", text: "נא לבחור שעת התחלה ושעת סיום" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          date,
          teacherId,
          maxParticipants: max,
          startTime,
          endTime,
          ...(generalDescription.trim() ? { generalDescription: generalDescription.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({
          type: "ok",
          text: "הסדנה נוצרה. היא תופיע תחת «סדנאות» בזימון שיעור כסוג מיון.",
        });
        setName("");
        setDate("");
        setTeacherId("");
        setStartTime("09:00");
        setEndTime("17:00");
        setMaxParticipants("");
        setGeneralDescription("");
        loadWorkshops();
      } else {
        setMessage({ type: "err", text: (data as { error?: string }).error ?? "שגיאה ביצירה" });
      }
    } catch {
      setMessage({ type: "err", text: "שגיאת רשת" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(w: AdminWorkshopRow) {
    if (
      !confirm(
        `למחוק את הסדנה «${w.name}» (${formatDateLabel(w.date)})? פעולה זו לא ניתנת לביטול.`
      )
    ) {
      return;
    }
    setDeletingId(w.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/workshops/${encodeURIComponent(w.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setMessage({ type: "ok", text: "הסדנה נמחקה." });
        loadWorkshops();
      } else {
        setMessage({
          type: "err",
          text: (data as { error?: string }).error ?? "לא ניתן למחוק",
        });
      }
    } catch {
      setMessage({ type: "err", text: "שגיאת רשת" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <h2 className="text-xl font-semibold text-[var(--color-text)]">יצירת מפגש סדנה</h2>
      <Card>
        <form onSubmit={handleCreate} className="space-y-4">
          <FormField
            label="שם הסדנה"
            name="name"
            value={name}
            onChange={setName}
            required
          />
          <div className="space-y-1">
            <label htmlFor="workshop-date" className="block text-sm font-medium text-[var(--color-text)]">
              תאריך הסדנה
            </label>
            <input
              id="workshop-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2 text-right min-h-[44px]"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="workshop-teacher" className="block text-sm font-medium text-[var(--color-text)]">
              מורה
            </label>
            <select
              id="workshop-teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2 text-right min-h-[44px] bg-white"
              required
              disabled={loadingTeachers}
            >
              <option value="">{loadingTeachers ? "טוען…" : "בחרו מורה"}</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || t.id}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="workshop-start" className="block text-sm font-medium text-[var(--color-text)]">
                שעת התחלה
              </label>
              <input
                id="workshop-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2 min-h-[44px] bg-white"
                required
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="workshop-end" className="block text-sm font-medium text-[var(--color-text)]">
                שעת סיום
              </label>
              <input
                id="workshop-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2 min-h-[44px] bg-white"
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label htmlFor="workshop-max" className="block text-sm font-medium text-[var(--color-text)]">
              מספר משתתפים
            </label>
            <input
              id="workshop-max"
              name="maxParticipants"
              type="number"
              min={1}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(e.target.value)}
              className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2 text-right min-h-[44px]"
              required
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="workshop-general" className="block text-sm font-medium text-[var(--color-text)]">
              הסבר כללי <span className="text-[var(--color-text-muted)] font-normal">(אופציונלי)</span>
            </label>
            <textarea
              id="workshop-general"
              name="generalDescription"
              value={generalDescription}
              onChange={(e) => setGeneralDescription(e.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="למשל: מיקום, מה להביא, מבנה היום…"
              className="w-full rounded-[var(--radius-input)] border border-[var(--color-border)] px-3 py-2 text-right min-h-[100px] resize-y"
            />
            <p className="text-xs text-[var(--color-text-muted)] text-right">
              עד 4000 תווים. יוצג לתלמידים בזימון הסדנה.
            </p>
          </div>
          {message && (
            <p
              className={`text-sm text-right ${
                message.type === "ok" ? "text-green-700" : "text-red-600"
              }`}
            >
              {message.text}
            </p>
          )}
          <Button type="submit" className="w-full justify-center" disabled={submitting}>
            {submitting ? "יוצר…" : "יצירה"}
          </Button>
        </form>
      </Card>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">סדנאות קיימות</h3>
        {loadingWorkshops ? (
          <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
        ) : workshopsLoadError ? (
          <Card>
            <p className="text-sm text-red-600 text-right">{workshopsLoadError}</p>
            <button
              type="button"
              onClick={() => loadWorkshops()}
              className="mt-3 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
            >
              נסו שוב
            </button>
          </Card>
        ) : workshops.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--color-text-muted)] text-right">
              אין סדנאות במערכת.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {workshops.map((w) => (
              <li key={w.id}>
                <Card className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-right space-y-1 min-w-0">
                      <p className="font-medium text-[var(--color-text)]">{w.name}</p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {formatDateLabel(w.date)} · {w.startTime}–{w.endTime} · {w.teacherName}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        רישומים פעילים: {w.activeBookings} / {w.maxParticipants}
                      </p>
                      {w.generalDescription?.trim() && (
                        <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap border-t border-[var(--color-border)] pt-2 mt-2">
                          <span className="text-[var(--color-text-muted)]">הסבר: </span>
                          {w.generalDescription.trim()}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={deletingId === w.id}
                      onClick={() => handleDelete(w)}
                      className="shrink-0 rounded-[var(--radius-input)] border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 min-h-[44px]"
                    >
                      {deletingId === w.id ? "מוחק…" : "מחק סדנה"}
                    </button>
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
