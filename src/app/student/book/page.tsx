"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BackLink } from "@/components/design/BackLink";
import { apiJson, isAbortError } from "@/lib/api";
import {
  formatIsraelDateYYYYMMDD,
  addDaysYYYYMMDD,
  formatHebrewShortDate,
} from "@/lib/dates";

type Teacher = { id: string; name: string | null; bio: string | null; profileImageUrl?: string | null };
type Slot = { id: string; date: string; startTime: string; endTime: string };

export default function StudentBookPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiJson<Teacher[]>("/api/teachers").then((r) => {
      if (r.ok) setTeachers(r.data);
      setLoadingTeachers(false);
    });
  }, []);

  // AbortController: avoid race where an older availability response overwrites a newer one when teacher changes quickly.
  useEffect(() => {
    if (!selectedTeacher) {
      setSlots([]);
      setSelectedSlot(null);
      setError("");
      return;
    }
    setError("");
    setSelectedSlot(null);
    setLoadingSlots(true);
    const controller = new AbortController();
    const startStr = formatIsraelDateYYYYMMDD(new Date());
    const endStr = addDaysYYYYMMDD(startStr, 14);
    apiJson<Slot[]>(
      `/api/teachers/${selectedTeacher.id}/availability?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`,
      { signal: controller.signal }
    )
      .then((r) => {
        if (controller.signal.aborted) return;
        if (r.ok) setSlots(r.data);
        else setSlots([]);
      })
      .catch((e) => {
        if (!controller.signal.aborted && !isAbortError(e)) setSlots([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false);
      });
    return () => controller.abort();
  }, [selectedTeacher]);

  function handleConfirm() {
    if (!selectedSlot || !selectedTeacher) return;
    setSubmitting(true);
    setError("");
    apiJson<{ id: string; date: string; startTime: string; endTime: string }>("/api/lessons/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilityId: selectedSlot.id }),
    }).then((result) => {
      if (result.ok) {
        router.push("/student");
        router.refresh();
        return;
      }
      setSubmitting(false);
      setError(result.error);
      if (result.status === 409) {
        setSelectedSlot(null);
        const startStr = formatIsraelDateYYYYMMDD(new Date());
        const endStr = addDaysYYYYMMDD(startStr, 14);
        apiJson<Slot[]>(
          `/api/teachers/${selectedTeacher.id}/availability?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`
        ).then((r) => {
          if (r.ok) setSlots(r.data);
        });
      }
    });
  }

  const busy = loadingSlots || submitting;
  const formatDate = formatHebrewShortDate;

  return (
    <AppShell title="קביעת שיעור">
      <div className="max-w-2xl mx-auto space-y-8" dir="rtl">
        <BackLink href="/student" label="חזרה לשיעורים שלי" />

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">
            1. בחר/י מורה
          </h2>
          {loadingTeachers ? (
            <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
          ) : teachers.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">
              אין מורים זמינים כרגע. נא לפנות לאדמין.
            </p>
          ) : (
            <ul className="space-y-2">
              {teachers.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTeacher(t)}
                    disabled={busy}
                    className={`w-full text-right rounded-[var(--radius-card)] border px-4 py-3 transition disabled:opacity-60 ${
                      selectedTeacher?.id === t.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                    }`}
                  >
                    <p className="font-medium text-[var(--color-text)]">
                      {t.name || "מורה"}
                    </p>
                    {t.bio && (
                      <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                        {t.bio}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {selectedTeacher && (
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              2. בחר/י משבצת זמן
            </h2>
            {loadingSlots ? (
              <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">
                אין משבצות פנויות בשבועיים הקרובים.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {slots.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      disabled={submitting}
                      className={`w-full text-right rounded-[var(--radius-input)] border px-3 py-2.5 text-sm transition disabled:opacity-60 ${
                        selectedSlot?.id === s.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                          : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                      }`}
                    >
                      {formatDate(s.date)} {s.startTime}–{s.endTime}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {selectedTeacher && selectedSlot && (
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">
              3. אישור
            </h2>
            <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 space-y-2">
              <p className="text-[var(--color-text)]">
                <span className="font-medium">מורה:</span>{" "}
                {selectedTeacher.name || "מורה"}
              </p>
              <p className="text-[var(--color-text)]">
                <span className="font-medium">תאריך ושעה:</span>{" "}
                {formatDate(selectedSlot.date)} {selectedSlot.startTime}–
                {selectedSlot.endTime}
              </p>
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="mt-4 w-full py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "מאשר…" : "אשר קביעת שיעור"}
            </button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
