"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { BackLink } from "@/components/design/BackLink";

type Lesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  reportCompleted?: boolean;
  student: { name: string | null; email: string };
  summary: { summaryText: string; homeworkText: string; pdfUrl?: string | null } | null;
};

const MOCK_LESSON: Lesson = {
  id: "demo",
  date: "2025-02-18",
  startTime: "11:00",
  endTime: "11:45",
  status: "completed",
  student: { name: "מאי גולן", email: "maya@example.com" },
  summary: null,
};

const MOCK_LESSON_DONE: Lesson = {
  ...MOCK_LESSON,
  summary: {
    summaryText: "עבדנו על משוואות ריבועיות ופתרון עם נוסחת השורשים.",
    homeworkText: "עמוד 42 תרגילים 1–5.",
    pdfUrl: null,
  },
};

export default function TeacherLessonReportPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const isDemo = id === "demo";
  const isDemoDone = id === "demo-done";
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(!isDemo && !isDemoDone);
  const [summaryText, setSummaryText] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isDemo) {
      setLesson(MOCK_LESSON);
      setLoading(false);
      return;
    }
    if (isDemoDone) {
      setLesson(MOCK_LESSON_DONE);
      setLoading(false);
      return;
    }
    if (!id) return;
    fetch(`/api/teacher/lessons/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setLesson)
      .catch(() => setLesson(null))
      .finally(() => setLoading(false));
  }, [id, isDemo, isDemoDone]);

  useEffect(() => {
    if (lesson?.summary) {
      setSummaryText(lesson.summary.summaryText);
      setHomeworkText(lesson.summary.homeworkText);
    }
  }, [lesson]);

  const alreadyCompleted = !!lesson?.reportCompleted || !!lesson?.summary;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summaryText.trim() && !homeworkText.trim()) {
      setError("נא למלא סיכום או משימות לתרגול.");
      return;
    }
    setStatus("loading");
    setError("");
    if (isDemo) {
      setTimeout(() => {
        setStatus("idle");
        router.push("/teacher/dashboard");
      }, 500);
      return;
    }
    try {
      const res = await fetch(`/api/teacher/lessons/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summaryText: summaryText.trim(),
          homeworkText: homeworkText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בשליחה");
        setStatus("error");
        return;
      }
      router.push("/teacher/dashboard");
      router.refresh();
    } catch {
      setError("שגיאת רשת");
      setStatus("error");
    }
  }

  if (loading || !id) {
    return (
      <AppShell title="דוח שיעור">
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      </AppShell>
    );
  }

  if (!lesson) {
    return (
      <AppShell title="דוח שיעור">
        <p className="text-sm text-[var(--color-text-muted)]">שיעור לא נמצא.</p>
        <Link href="/teacher/dashboard" className="text-[var(--color-primary)] hover:underline mt-2 inline-block">
          חזרה ללוח המורה
        </Link>
      </AppShell>
    );
  }

  const studentName = lesson.student.name || lesson.student.email;

  return (
    <AppShell title="דוח שיעור">
      <div className="max-w-xl space-y-6" dir="rtl">
        {(isDemo || isDemoDone) && (
          <p className="text-center text-sm text-[var(--color-text-muted)] rounded-[var(--radius-input)] bg-[var(--color-highlight)]/50 py-2 px-3">
            תצוגת דמו
          </p>
        )}
        <BackLink href="/teacher/dashboard" label="חזרה ללוח המורה" />
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4">
          <p className="font-medium text-[var(--color-text)]">
            {lesson.date} {lesson.startTime}–{lesson.endTime}
          </p>
          <p className="text-sm text-[var(--color-text-muted)]">{studentName}</p>
        </div>

        {alreadyCompleted ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-4 space-y-3">
            <h3 className="font-semibold text-[var(--color-text)]">סיכום השיעור</h3>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
              {lesson.summary?.summaryText || "—"}
            </p>
            <h3 className="font-semibold text-[var(--color-text)]">משימות לתרגול</h3>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
              {lesson.summary?.homeworkText || "—"}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              הדוח הושלם ואין אפשרות לעריכה.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                סיכום השיעור
              </label>
              <textarea
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] text-sm"
                placeholder="מה נלמד בשיעור?"
                disabled={status === "loading"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">
                משימות לתרגול
              </label>
              <textarea
                value={homeworkText}
                onChange={(e) => setHomeworkText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] text-sm"
                placeholder="תרגול והכנה לשיעור הבא"
                disabled={status === "loading"}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-2.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {status === "loading" ? "שולח…" : "שליחה ושמירה"}
            </button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
