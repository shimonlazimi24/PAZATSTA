"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { BackLink } from "@/components/design/BackLink";
import { apiJson } from "@/lib/api";
import { formatHebrewShortDate } from "@/lib/dates";
import { SCREENING_TOPICS } from "@/data/topics";
import {
  getTipsForScreening,
  parseTipsToIds,
  buildTipsFromIds,
  getTipsDisplayText,
} from "@/data/tips";
import { isLessonEnded } from "@/lib/dates";

type Lesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  reportCompleted?: boolean;
  followUpCompletedAt?: string | null;
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

export default function TeacherLessonReportPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(!!id);
  const [summaryText, setSummaryText] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [pointsToKeep, setPointsToKeep] = useState("");
  const [pointsToImprove, setPointsToImprove] = useState("");
  const [tips, setTips] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [screeningType, setScreeningType] = useState("");
  const [screeningDate, setScreeningDate] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiJson<Lesson>(`/api/teacher/lessons/${id}`, { credentials: "include" })
      .then((r) => {
        if (r.ok) {
          const data = r.data;
          // Route protection: redirect if lesson not approved
          if (data.status !== "scheduled" && data.status !== "completed") {
            router.replace("/teacher/dashboard?error=report_blocked");
            return;
          }
          setLesson(data);
        } else if (r.status === 401 || r.status === 403) {
          router.replace("/login/teacher");
          return;
        } else {
          setLesson(null);
        }
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const tipsIds = parseTipsToIds(tips);
  const tipGroups = getTipsForScreening(screeningType);
  function toggleTip(id: string) {
    const next = new Set(tipsIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTips(buildTipsFromIds(next));
  }

  const DRAFT_KEY = id ? `paza_report_draft_${id}` : "";

  useEffect(() => {
    if (lesson) {
      setScreeningType(lesson.student.screeningType ?? "");
      setScreeningDate(lesson.student.screeningDate ?? "");
      if (lesson.summary) {
        setSummaryText(lesson.summary.summaryText);
        setHomeworkText(lesson.summary.homeworkText);
        setPointsToKeep(lesson.summary.pointsToKeep ?? "");
        setPointsToImprove(lesson.summary.pointsToImprove ?? "");
        setTips(lesson.summary.tips ?? "");
        setRecommendations(lesson.summary.recommendations ?? "");
        if (DRAFT_KEY && typeof sessionStorage !== "undefined") sessionStorage.removeItem(DRAFT_KEY);
      }
    }
  }, [lesson, DRAFT_KEY]);

  useEffect(() => {
    if (!DRAFT_KEY || lesson?.summary) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as Record<string, string>;
        if (d.summaryText !== undefined) setSummaryText(d.summaryText);
        if (d.homeworkText !== undefined) setHomeworkText(d.homeworkText);
        if (d.pointsToKeep !== undefined) setPointsToKeep(d.pointsToKeep);
        if (d.pointsToImprove !== undefined) setPointsToImprove(d.pointsToImprove);
        if (d.tips !== undefined) setTips(d.tips);
        if (d.recommendations !== undefined) setRecommendations(d.recommendations);
      }
    } catch {
      /* ignore */
    }
  }, [DRAFT_KEY, lesson?.summary]);

  useEffect(() => {
    if (!DRAFT_KEY || lesson?.summary) return;
    const payload = {
      summaryText,
      homeworkText,
      pointsToKeep,
      pointsToImprove,
      tips,
      recommendations,
    };
    const t = setTimeout(() => {
      try {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
    }, 500);
    return () => clearTimeout(t);
  }, [DRAFT_KEY, lesson?.summary, summaryText, homeworkText, pointsToKeep, pointsToImprove, tips, recommendations]);

  const alreadyCompleted = !!lesson?.reportCompleted || !!lesson?.summary;
  const lessonDateDisplay = lesson?.date ? formatHebrewShortDate(lesson.date) : lesson?.date ?? "—";
  const lessonEnded = lesson ? isLessonEnded(lesson.date, lesson.endTime) : false;
  const canSubmitReport = lesson?.status === "scheduled" && lessonEnded && !alreadyCompleted;

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
    const result = await apiJson<{ ok?: boolean }>(`/api/teacher/lessons/${id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summaryText: summaryText.trim(),
        homeworkText: homeworkText.trim(),
        pointsToKeep: pointsToKeep.trim(),
        pointsToImprove: pointsToImprove.trim(),
        tips: tips.trim(),
        recommendations: recommendations.trim(),
        screeningType: screeningType.trim() || undefined,
        screeningDate: screeningDate.trim() || undefined,
      }),
    });
    if (!result.ok) {
      setError(result.error);
      setStatus("error");
      if (result.status === 401) {
        router.replace("/login/teacher");
        return;
      }
      if (result.status === 409) {
        apiJson<Lesson>(`/api/teacher/lessons/${id}`).then((r) => r.ok && setLesson(r.data));
      }
      return;
    }
    if (id && typeof sessionStorage !== "undefined") sessionStorage.removeItem(`paza_report_draft_${id}`);
    setStatus("idle");
    apiJson<Lesson>(`/api/teacher/lessons/${id}`).then((r) => {
      if (r.ok) setLesson(r.data);
    });
    router.refresh();
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("teacher-lessons-refresh"));
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
  const teacherDisplay = lesson.teacher?.name ?? lesson.teacher?.email ?? "—";

  const fieldClass =
    "w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] text-sm";
  const labelClass = "block text-sm font-medium text-[var(--color-text)] mb-1";

  return (
    <AppShell title="דוח סיום שיעור">
      <div className="max-w-xl space-y-6" dir="rtl">
        <BackLink href="/teacher/dashboard" label="חזרה ללוח המורה" />

        {/* Standalone title - not concatenated with LTR content */}
        <header>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">דוח סיום שיעור</h1>
        </header>

        {/* Meta info in separate section - LTR values isolated to prevent bidi corruption */}
        <section>
          <h2 className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">פרטי השיעור</h2>
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 space-y-2 text-sm">
            <p>
              <span className="text-[var(--color-text-muted)]">שם המורה:</span>{" "}
              <bdi>{teacherDisplay}</bdi>
            </p>
            <p>
              <span className="text-[var(--color-text-muted)]">שם תלמיד:</span>{" "}
              <bdi>{studentName}</bdi>
            </p>
            <p>
              <span className="text-[var(--color-text-muted)]">תאריך השיעור:</span>{" "}
              <span className="ltr-isolate">{lessonDateDisplay} {lesson.startTime}–{lesson.endTime}</span>
            </p>
            {alreadyCompleted ? (
              <>
                <p>
                  <span className="text-[var(--color-text-muted)]">תאריך המיון:</span>{" "}
                  <span className="ltr-isolate">{lesson.student.screeningDate ?? "—"}</span>
                </p>
                <p>
                  <span className="text-[var(--color-text-muted)]">סוג המיון:</span>{" "}
                  <bdi>{lesson.student.screeningType ?? "—"}</bdi>
                </p>
              </>
            ) : (
              <>
                <div>
                  <label className={labelClass}>תאריך המיון</label>
                  <input
                    type="date"
                    value={screeningDate}
                    onChange={(e) => setScreeningDate(e.target.value)}
                    className={fieldClass}
                    dir="ltr"
                    disabled={status === "loading"}
                  />
                </div>
                <div>
                  <label className={labelClass}>סוג המיון</label>
                  <select
                    value={screeningType}
                    onChange={(e) => setScreeningType(e.target.value)}
                    className={fieldClass}
                    disabled={status === "loading"}
                  >
                    <option value="">—</option>
                    {SCREENING_TOPICS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        </section>

        {!canSubmitReport && !alreadyCompleted ? (
          <div className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 p-4" dir="rtl">
            <p className="text-red-700 font-medium">
              {lesson?.status !== "scheduled"
                ? "השיעור לא אושר"
                : "אפשר למלא דוח רק אחרי השיעור"}
            </p>
            <Link href="/teacher/dashboard" className="text-[var(--color-primary)] hover:underline mt-2 inline-block">
              חזרה ללוח המורה
            </Link>
          </div>
        ) : alreadyCompleted ? (
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
              {getTipsDisplayText(lesson.summary?.tips ?? "") || "—"}
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
              <label className={labelClass}>טיפים (בחירה לפי סוג המיון)</label>
              {tipGroups.length === 0 ? (
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  בחרו סוג מיון למעלה כדי לראות טיפים רלוונטיים
                </p>
              ) : (
                <div className="mt-2 space-y-4">
                  {tipGroups.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <p className="text-sm font-medium text-[var(--color-text-muted)]">{group.label}</p>
                      <div className="space-y-1.5">
                        {group.tips.map((tip) => {
                          const selected = tipsIds.has(tip.id);
                          return (
                            <label
                              key={tip.id}
                              className="flex items-start gap-2 cursor-pointer text-sm text-[var(--color-text)]"
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleTip(tip.id)}
                                disabled={status === "loading"}
                                className="mt-0.5 rounded border-[var(--color-border)]"
                              />
                              <span>{tip.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
