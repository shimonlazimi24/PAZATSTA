"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { BackLink } from "@/components/design/BackLink";

type Teacher = { id: string; email: string; name: string | null; bio: string | null };
type Slot = { id: string; date: string; startTime: string; endTime: string };

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("he-IL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

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
    fetch("/api/teachers")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTeachers)
      .finally(() => setLoadingTeachers(false));
  }, []);

  useEffect(() => {
    if (!selectedTeacher) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    setLoadingSlots(true);
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 14);
    fetch(
      `/api/teachers/${selectedTeacher.id}/availability?start=${start.toISOString().slice(0, 10)}&end=${end.toISOString().slice(0, 10)}`
    )
      .then((r) => (r.ok ? r.json() : []))
      .then(setSlots)
      .finally(() => setLoadingSlots(false));
    setSelectedSlot(null);
  }, [selectedTeacher]);

  function handleConfirm() {
    if (!selectedSlot) return;
    setSubmitting(true);
    setError("");
    fetch("/api/lessons/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilityId: selectedSlot.id }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error || "שגיאה בקביעת השיעור");
          setSubmitting(false);
          return;
        }
        router.push("/student");
        router.refresh();
      })
      .catch(() => {
        setError("שגיאת רשת");
        setSubmitting(false);
      });
  }

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
                    className={`w-full text-right rounded-[var(--radius-card)] border px-4 py-3 transition ${
                      selectedTeacher?.id === t.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border)] bg-white hover:border-[var(--color-primary)]"
                    }`}
                  >
                    <p className="font-medium text-[var(--color-text)]">
                      {t.name || t.email}
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
                      className={`w-full text-right rounded-[var(--radius-input)] border px-3 py-2.5 text-sm transition ${
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
                {selectedTeacher.name || selectedTeacher.email}
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
