"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { BackLink } from "@/components/design/BackLink";
import { apiJson } from "@/lib/api";
import { formatHebrewShortDate } from "@/lib/dates";
import { SCREENING_TOPICS } from "@/data/topics";
import type { ReportField, OfferedTip } from "@/lib/report-template";
import { isLessonStarted } from "@/lib/dates";

/** Mirrors the cap enforced by /api/teacher/lessons/[id]/complete. */
const MAX_FIELD_LENGTH = 5000;

type Lesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  reportCompleted?: boolean;
  followUpCompletedAt?: string | null;
  topic?: string | null;
  teacher?: { name: string | null; email: string };
  student: {
    name: string | null;
    email: string;
    screeningType?: string | null;
    screeningDate?: string | null;
    parentEmail?: string | null;
  };
  summary: {
    summaryText: string;
    homeworkText: string;
    pointsToKeep?: string;
    pointsToImprove?: string;
    tips?: string;
    tipsCustom?: string;
    tipsSnapshot?: string;
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
  const [tipSlugs, setTipSlugs] = useState<Set<string>>(new Set());
  const [tipsCustom, setTipsCustom] = useState("");
  const [template, setTemplate] = useState<{ fields: ReportField[]; tips: OfferedTip[] } | null>(null);
  const [recommendations, setRecommendations] = useState("");
  const [screeningType, setScreeningType] = useState("");
  const [screeningDate, setScreeningDate] = useState("");
  const [parentEmail, setParentEmail] = useState("");
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

  function toggleTip(slug: string) {
    setTipSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  // The tips offered depend on the lesson's type, which the server resolves; the
  // field wording is admin-configurable. Both arrive together.
  useEffect(() => {
    if (!id) return;
    // screeningType is a dependency: on a lesson with no topic the teacher picks
    // it here, and the offered tips have to follow that choice.
    const query = screeningType.trim()
      ? `?lessonId=${encodeURIComponent(id)}&topic=${encodeURIComponent(screeningType.trim())}`
      : `?lessonId=${encodeURIComponent(id)}`;
    apiJson<{ fields: ReportField[]; tips: OfferedTip[] }>(`/api/report-template${query}`).then(
      (r) => {
        if (r.ok) setTemplate({ fields: r.data.fields, tips: r.data.tips });
      }
    );
  }, [id, screeningType]);

  const fieldByKey = useMemo(() => {
    const map = new Map<string, ReportField>();
    for (const f of template?.fields ?? []) map.set(f.key, f);
    return map;
  }, [template]);

  /** Tips grouped for display, preserving the order the server returned. */
  const tipGroups = useMemo(() => {
    const groups: { label: string; tips: OfferedTip[] }[] = [];
    for (const tip of template?.tips ?? []) {
      const label = tip.groupLabel || "כלליים";
      const existing = groups.find((g) => g.label === label);
      if (existing) existing.tips.push(tip);
      else groups.push({ label, tips: [tip] });
    }
    return groups;
  }, [template]);

  // Bumped: the previous draft shape stored tips as a comma-separated string, and
  // restoring it into a Set-based selection would silently drop the choices.
  const DRAFT_KEY = id ? `paza_report_draft_v2_${id}` : "";

  useEffect(() => {
    if (lesson) {
      setScreeningType(lesson.topic ?? lesson.student.screeningType ?? "");
      setScreeningDate(lesson.student.screeningDate ?? "");
      setParentEmail(lesson.student.parentEmail ?? "");
      if (lesson.summary) {
        setSummaryText(lesson.summary.summaryText);
        setHomeworkText(lesson.summary.homeworkText);
        setPointsToKeep(lesson.summary.pointsToKeep ?? "");
        setPointsToImprove(lesson.summary.pointsToImprove ?? "");
        setTipSlugs(
          new Set(
            (lesson.summary.tips ?? "")
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          )
        );
        setTipsCustom(lesson.summary.tipsCustom ?? "");
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
        const d = JSON.parse(raw) as Record<string, unknown>;
        if (typeof d.summaryText === "string") setSummaryText(d.summaryText);
        if (typeof d.homeworkText === "string") setHomeworkText(d.homeworkText);
        if (typeof d.pointsToKeep === "string") setPointsToKeep(d.pointsToKeep);
        if (typeof d.pointsToImprove === "string") setPointsToImprove(d.pointsToImprove);
        if (Array.isArray(d.tipSlugs)) setTipSlugs(new Set(d.tipSlugs as string[]));
        if (typeof d.tipsCustom === "string") setTipsCustom(d.tipsCustom);
        if (typeof d.recommendations === "string") setRecommendations(d.recommendations);
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
      tipSlugs: Array.from(tipSlugs),
      tipsCustom,
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
  }, [DRAFT_KEY, lesson?.summary, summaryText, homeworkText, pointsToKeep, pointsToImprove, tipSlugs, tipsCustom, recommendations]);

  const alreadyCompleted = !!lesson?.reportCompleted || !!lesson?.summary;
  const lessonDateDisplay = lesson?.date ? formatHebrewShortDate(lesson.date) : lesson?.date ?? "—";
  const lessonStarted = lesson ? isLessonStarted(lesson.date, lesson.startTime) : false;
  const canSubmitReport = lesson?.status === "scheduled" && lessonStarted && !alreadyCompleted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const missing: string[] = [];
    if (!summaryText.trim()) missing.push("סיכום כללי");
    if (!pointsToKeep.trim()) missing.push("נקודות לשימור");
    if (!pointsToImprove.trim()) missing.push("נקודות לשיפור");
    if (!recommendations.trim()) missing.push("המלצות להמשך");
    if (missing.length > 0) {
      setError(`נא למלא את השדות החובה: ${missing.join(", ")}`);
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
        tipIds: Array.from(tipSlugs),
        tipsCustom: tipsCustom.trim(),
        recommendations: recommendations.trim(),
        screeningType: screeningType.trim() || undefined,
        screeningDate: screeningDate.trim() || undefined,
        parentEmail: parentEmail.trim() || undefined,
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
    if (id && typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(DRAFT_KEY);
      // Drop the pre-v2 draft too, so a teacher who had this page open across the
      // deploy is not left with an orphaned entry.
      sessionStorage.removeItem(`paza_report_draft_${id}`);
    }
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
        <BackLink href="/teacher/dashboard" label="חזרה ללוח המורה" refreshOnNavigate className="text-[var(--color-primary)] hover:underline mt-2 inline-block" />
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
        <BackLink href="/teacher/dashboard" label="חזרה ללוח המורה" refreshOnNavigate />

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
                  <bdi>{lesson.topic ?? lesson.student.screeningType ?? "—"}</bdi>
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
                  {lesson.topic ? (
                    <p className="py-2 text-sm text-[var(--color-text)]" dir="rtl">
                      <bdi>{lesson.topic}</bdi>
                    </p>
                  ) : (
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
                  )}
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
                : "אפשר למלא דוח רק אחרי תחילת השיעור"}
            </p>
            <BackLink href="/teacher/dashboard" label="חזרה ללוח המורה" refreshOnNavigate className="text-[var(--color-primary)] hover:underline mt-2 inline-block" />
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
              {lesson.summary?.tipsSnapshot?.trim() || lesson.summary?.tipsCustom?.trim() || "—"}
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
            {!alreadyCompleted && (
              <div>
                <label className={labelClass}>אימייל הורה (לשליחת סיכום)</label>
                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className={fieldClass}
                  dir="ltr"
                  disabled={status === "loading"}
                />
              </div>
            )}
            <div>
              <label className={labelClass}>
                {fieldByKey.get("summaryText")?.label ?? "סיכום כללי"}
                {(fieldByKey.get("summaryText")?.isRequired ?? true) && (
                  <span className="text-red-600" aria-hidden> *</span>
                )}
              </label>
              <textarea
                maxLength={MAX_FIELD_LENGTH}
                value={summaryText}
                onChange={(e) => setSummaryText(e.target.value)}
                rows={3}
                className={fieldClass}
                placeholder="סיכום כללי של השיעור"
                disabled={status === "loading"}
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                {fieldByKey.get("pointsToKeep")?.label ?? "נקודות לשימור"}
                {(fieldByKey.get("pointsToKeep")?.isRequired ?? true) && (
                  <span className="text-red-600" aria-hidden> *</span>
                )}
              </label>
              <textarea
                maxLength={MAX_FIELD_LENGTH}
                value={pointsToKeep}
                onChange={(e) => setPointsToKeep(e.target.value)}
                rows={2}
                className={fieldClass}
                placeholder="מה עבד טוב, לשמור עליו"
                disabled={status === "loading"}
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                {fieldByKey.get("pointsToImprove")?.label ?? "נקודות לשיפור"}
                {(fieldByKey.get("pointsToImprove")?.isRequired ?? true) && (
                  <span className="text-red-600" aria-hidden> *</span>
                )}
              </label>
              <textarea
                maxLength={MAX_FIELD_LENGTH}
                value={pointsToImprove}
                onChange={(e) => setPointsToImprove(e.target.value)}
                rows={2}
                className={fieldClass}
                placeholder="מה לשפר"
                disabled={status === "loading"}
                required
              />
            </div>
            <div>
              <label className={labelClass}>{fieldByKey.get("tips")?.label ?? "טיפים"}</label>
              {fieldByKey.get("tips")?.helpText ? (
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {fieldByKey.get("tips")!.helpText}
                </p>
              ) : null}
              {tipGroups.length > 0 && (
                <div className="mt-2 space-y-4">
                  {tipGroups.map((group) => (
                    <div key={group.label} className="space-y-2">
                      <p className="text-sm font-medium text-[var(--color-text-muted)]">{group.label}</p>
                      <div className="space-y-1.5">
                        {group.tips.map((tip) => (
                          <label
                            key={tip.slug}
                            className="flex items-start gap-2 cursor-pointer text-sm text-[var(--color-text)]"
                          >
                            <input
                              type="checkbox"
                              checked={tipSlugs.has(tip.slug)}
                              onChange={() => toggleTip(tip.slug)}
                              disabled={status === "loading"}
                              className="mt-0.5 rounded border-[var(--color-border)]"
                            />
                            <span>{tip.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Always offered. It used to appear only when no tips matched the
                  lesson type, so a teacher on a דפ״ר lesson had no way to add a
                  note of their own. */}
              <div className="mt-3">
                <p className="text-sm text-[var(--color-text-muted)] mb-2">
                  {tipGroups.length > 0 ? "להוספה — מלל חופשי" : "אחר — מלל חופשי"}
                </p>
                <textarea
                  maxLength={MAX_FIELD_LENGTH}
                  value={tipsCustom}
                  onChange={(e) => setTipsCustom(e.target.value)}
                  rows={4}
                  className={fieldClass}
                  placeholder="הזינו טיפים נוספים..."
                  disabled={status === "loading"}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>
                {fieldByKey.get("recommendations")?.label ?? "המלצות להמשך"}
                {(fieldByKey.get("recommendations")?.isRequired ?? true) && (
                  <span className="text-red-600" aria-hidden> *</span>
                )}
              </label>
              <textarea
                maxLength={MAX_FIELD_LENGTH}
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                rows={2}
                className={fieldClass}
                placeholder="המלצות לשיעורים הבאים"
                disabled={status === "loading"}
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                {fieldByKey.get("homeworkText")?.label ?? "משימות לתרגול"}
                {fieldByKey.get("homeworkText")?.isRequired && (
                  <span className="text-red-600" aria-hidden> *</span>
                )}
              </label>
              <textarea
                maxLength={MAX_FIELD_LENGTH}
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
