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
  teacher?: { name: string | null; email: string };
  student: {
    name: string | null;
    email: string;
    screeningType?: string | null;
    screeningDate?: string | null;
  };
  summary: {
    summaryText: string;
    homeworkText: string;
    pointsToKeep?: string;
    pointsToImprove?: string;
    tips?: string;
    recommendations?: string;
    pdfUrl?: string | null;
  } | null;
};

const MOCK_LESSON: Lesson = {
  id: "demo",
  date: "2025-02-18",
  startTime: "11:00",
  endTime: "11:45",
  status: "completed",
  teacher: { name: "דני כהן", email: "teacher@test.com" },
  student: { name: "מאי גולן", email: "maya@example.com", screeningType: "יום המא\"ה - מבחנים פסיכוטכניים", screeningDate: "2025-03-01" },
  summary: null,
};

const TIP_TAGS = [
  "ניצול זמן",
  "הרגעה לפני מבחן",
  "קריאה מדויקת של השאלה",
  "סדר פתרון",
  "תרגול סימולציות",
  "שינה לפני מיון",
  "הגעה בזמן",
  "בגדים נוחים",
  "מזון/מים",
  "אחר",
];

const MOCK_LESSON_DONE: Lesson = {
  ...MOCK_LESSON,
  teacher: { name: "דני כהן", email: "teacher@test.com" },
  student: { ...MOCK_LESSON.student, screeningType: "יום המא\"ה - מבחנים פסיכוטכניים", screeningDate: "2025-03-01" },
  summary: {
    summaryText: "עבדנו על חשיבה כמותית ותרגול שאלות מהמא״ה.",
    homeworkText: "תרגול פרק 3 – 20 שאלות.",
    pointsToKeep: "התלמידה מתקדמת יפה בשאלות מילוליות.",
    pointsToImprove: "להתאמן יותר על גאומטריה.",
    tips: "ניצול זמן, תרגול סימולציות",
    recommendations: "להמשיך עם תרגול מלא סימולציה.",
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
  const [pointsToKeep, setPointsToKeep] = useState("");
  const [pointsToImprove, setPointsToImprove] = useState("");
  const [tips, setTips] = useState("");
  const [recommendations, setRecommendations] = useState("");
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

  const tipsSet = new Set(
    tips
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
  function toggleTip(tag: string) {
    const next = new Set(tipsSet);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    setTips(Array.from(next).join(", "));
  }

  useEffect(() => {
    if (lesson?.summary) {
      setSummaryText(lesson.summary.summaryText);
      setHomeworkText(lesson.summary.homeworkText);
      setPointsToKeep(lesson.summary.pointsToKeep ?? "");
      setPointsToImprove(lesson.summary.pointsToImprove ?? "");
      setTips(lesson.summary.tips ?? "");
      setRecommendations(lesson.summary.recommendations ?? "");
    }
  }, [lesson]);

  const alreadyCompleted = !!lesson?.reportCompleted || !!lesson?.summary;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasAny =
      summaryText.trim() ||
      homeworkText.trim() ||
      pointsToKeep.trim() ||
      pointsToImprove.trim() ||
      tips.trim() ||
      recommendations.trim();
    if (!hasAny) {
      setError("נא למלא לפחות שדה אחד בדוח.");
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
          pointsToKeep: pointsToKeep.trim(),
          pointsToImprove: pointsToImprove.trim(),
          tips: tips.trim(),
          recommendations: recommendations.trim(),
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
      <AppShell title="דוח סיום שיעור">
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      </AppShell>
    );
  }

  if (!lesson) {
    return (
      <AppShell title="דוח סיום שיעור">
        <p className="text-sm text-[var(--color-text-muted)]">שיעור לא נמצא.</p>
        <Link href="/teacher/dashboard" className="text-[var(--color-primary)] hover:underline mt-2 inline-block">
          חזרה ללוח המורה
        </Link>
      </AppShell>
    );
  }

  const studentName = lesson.student.name || lesson.student.email;

  const fieldClass =
    "w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] text-sm";
  const labelClass = "block text-sm font-medium text-[var(--color-text)] mb-1";

  return (
    <AppShell title="דוח סיום שיעור">
      <div className="max-w-xl space-y-6" dir="rtl">
        {(isDemo || isDemoDone) && (
          <p className="text-center text-sm text-[var(--color-text-muted)] rounded-[var(--radius-input)] bg-[var(--color-highlight)]/50 py-2 px-3">
            תצוגת דמו
          </p>
        )}
        <BackLink href="/teacher/dashboard" label="חזרה ללוח המורה" />

        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">פרטי השיעור</h2>
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 space-y-2 text-sm">
            <p><span className="text-[var(--color-text-muted)]">שם המורה:</span> {lesson.teacher?.name ?? lesson.teacher?.email ?? "—"}</p>
            <p><span className="text-[var(--color-text-muted)]">שם תלמיד:</span> {studentName}</p>
            <p><span className="text-[var(--color-text-muted)]">תאריך השיעור:</span> {lesson.date} {lesson.startTime}–{lesson.endTime}</p>
            <p><span className="text-[var(--color-text-muted)]">תאריך המיון:</span> {lesson.student.screeningDate ?? "—"}</p>
            <p><span className="text-[var(--color-text-muted)]">סוג המיון:</span> {lesson.student.screeningType ?? "—"}</p>
          </div>
        </section>

        {alreadyCompleted ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-bg-muted)] p-4 space-y-4">
            <h3 className="font-semibold text-[var(--color-text)]">סיכום כללי</h3>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
              {lesson.summary?.summaryText || "—"}
            </p>
            <h3 className="font-semibold text-[var(--color-text)]">נקודות לשימור</h3>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
              {lesson.summary?.pointsToKeep || "—"}
            </p>
            <h3 className="font-semibold text-[var(--color-text)]">נקודות לשיפור</h3>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
              {lesson.summary?.pointsToImprove || "—"}
            </p>
            <h3 className="font-semibold text-[var(--color-text)]">טיפים</h3>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
              {lesson.summary?.tips || "—"}
            </p>
            <h3 className="font-semibold text-[var(--color-text)]">המלצות להמשך</h3>
            <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
              {lesson.summary?.recommendations || "—"}
            </p>
            {(lesson.summary?.homeworkText ?? "") && (
              <>
                <h3 className="font-semibold text-[var(--color-text)]">משימות לתרגול</h3>
                <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">
                  {lesson.summary?.homeworkText}
                </p>
              </>
            )}
            <p className="text-xs text-[var(--color-text-muted)] pt-2">
              הדוח הושלם ואין אפשרות לעריכה.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>סיכום כללי</label>
              <textarea
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                rows={3}
                className={fieldClass}
                placeholder="סיכום כללי של השיעור"
                disabled={status === "loading"}
              />
            </div>
            <div>
              <label className={labelClass}>נקודות לשימור</label>
              <textarea
                value={pointsToKeep}
                onChange={(e) => setPointsToKeep(e.target.value)}
                rows={2}
                className={fieldClass}
                placeholder="מה עבד טוב, לשמור עליו"
                disabled={status === "loading"}
              />
            </div>
            <div>
              <label className={labelClass}>נקודות לשיפור</label>
              <textarea
                value={pointsToImprove}
                onChange={(e) => setPointsToImprove(e.target.value)}
                rows={2}
                className={fieldClass}
                placeholder="מה לשפר"
                disabled={status === "loading"}
              />
            </div>
            <div>
              <label className={labelClass}>טיפים (בחירה)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TIP_TAGS.map((tag) => {
                  const selected = tipsSet.has(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTip(tag)}
                      disabled={status === "loading"}
                      className={`px-3 py-1.5 rounded-[var(--radius-input)] border text-sm font-medium transition-colors ${
                        selected
                          ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                          : "bg-white border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={labelClass}>המלצות להמשך</label>
              <textarea
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                rows={2}
                className={fieldClass}
                placeholder="המלצות לשיעורים הבאים"
                disabled={status === "loading"}
              />
            </div>
            <div>
              <label className={labelClass}>משימות לתרגול (אופציונלי)</label>
              <textarea
                value={homeworkText}
                onChange={(e) => setHomeworkText(e.target.value)}
                rows={2}
                className={fieldClass}
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
