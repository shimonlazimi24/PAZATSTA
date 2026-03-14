"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { addToCalendar } from "@/lib/calendar";
import { isLessonStarted } from "@/lib/dates";
import { formatLessonDate, getStatusLabel } from "@/lib/lesson-utils";
import type { DisplayLesson } from "@/types";

type Lesson = DisplayLesson & {
  student: NonNullable<DisplayLesson["student"]> & { id: string };
  summary: { pdfUrl: string | null } | null;
};

export function TeacherHomeLessons() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [upcoming, setUpcoming] = useState<Lesson[]>([]);
  const [past, setPast] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [followUpLoadingId, setFollowUpLoadingId] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const retryingRef = useRef(false);

  function load(retryCount = 0) {
    setLoading(true);
    setLoadError(null);
    const maxRetries = 2;
    fetch("/api/teacher/lessons?upcoming=true&past=true", { cache: "no-store", credentials: "include" })
      .then((r) => {
        if (r.ok) return r.json();
        if (r.status === 403 && retryCount < maxRetries) {
          retryingRef.current = true;
          return new Promise<{ upcoming: Lesson[]; past: Lesson[] } | null>((resolve) => {
            setTimeout(() => {
              load(retryCount + 1);
              resolve(null);
            }, 400 + retryCount * 300);
          });
        }
        return null;
      })
      .then((data) => {
        if (data && Array.isArray(data.upcoming)) {
          setUpcoming(data.upcoming ?? []);
          setPast(data.past ?? []);
        } else if (data === null && !retryingRef.current) {
          setLoadError("שגיאה בטעינת השיעורים. נסו לרענן את הדף.");
        }
      })
      .catch(() => {
        if (retryCount < maxRetries) {
          retryingRef.current = true;
          setTimeout(() => load(retryCount + 1), 500);
        } else {
          setLoadError("שגיאה בטעינת השיעורים. נסו לרענן את הדף.");
        }
      })
      .finally(() => {
        if (!retryingRef.current) setLoading(false);
        retryingRef.current = false;
      });
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (searchParams.has("r")) {
      router.replace("/teacher/dashboard", { scroll: false });
    }
  }, [router, searchParams]);

  useEffect(() => {
    const onRefresh = () => load();
    window.addEventListener("teacher-lessons-refresh", onRefresh);
    return () => window.removeEventListener("teacher-lessons-refresh", onRefresh);
  }, []);

  async function handleFollowUpComplete(lessonId: string) {
    setFollowUpLoadingId(lessonId);
    try {
      const res = await fetch(`/api/teacher/lessons/${lessonId}/follow-up-complete`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) load();
    } finally {
      setFollowUpLoadingId(null);
    }
  }

  async function handleCancel(lessonId: string) {
    if (!confirm("האם לבטל את השיעור? המשבצת תחזור לזמינות.")) return;
    setCancelingId(lessonId);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) load();
    } finally {
      setCancelingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-card)] text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" aria-hidden />
        <p className="mt-3 text-[var(--color-text-muted)]">טוען…</p>
      </div>
    );
  }

  const hasUpcoming = upcoming.length > 0;
  const hasPast = past.length > 0;
  if (loadError) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-card)] text-center" dir="rtl">
        <p className="text-[var(--color-text)]">{loadError}</p>
        <button
          type="button"
          onClick={() => load()}
          className="mt-4 rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          נסו שוב
        </button>
      </div>
    );
  }
  if (!hasUpcoming && !hasPast) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 sm:p-10 shadow-[var(--shadow-card)] text-center" dir="rtl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-highlight)] text-[var(--color-primary)]">
          <CalendarDays className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-[var(--color-text)]">
          אין שיעורים כרגע
        </h3>
        <p className="mt-2 max-w-sm mx-auto text-[var(--color-text-muted)]">
          השיעורים הקרובים והעבר יופיעו כאן אחרי שתגדירו זמינות ותלמידים יבחרו מועדים.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8" dir="rtl">
      {hasUpcoming && (
        <section>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            השיעורים הקרובים
          </h3>
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white overflow-hidden shadow-[var(--shadow-card)]">
            {upcoming.map((l) => {
              const studentLabel = l.student.name || l.student.email;
              const teacherLabel = l.teacher?.name || l.teacher?.email || "מורה";
              const topicLabel = l.topic?.trim() || "שיעור פזצט״א";
              const calendarTitle = `${topicLabel} – ${studentLabel}`;
              const calendarDescription = [
                `שם מלא של התלמיד: ${studentLabel}`,
                l.student.email ? `אימייל תלמיד: ${l.student.email}` : null,
                l.student.phone ? `טלפון תלמיד: ${l.student.phone}` : null,
                l.student.parentName ? `שם מלא של אחד ההורים: ${l.student.parentName}` : null,
                l.student.parentPhone ? `טלפון הורה: ${l.student.parentPhone}` : null,
                l.student.parentEmail ? `אימייל הורה: ${l.student.parentEmail}` : null,
                l.questionFromStudent ? `במה תרצו להתמקד בשיעור: ${l.questionFromStudent}` : null,
                `מורה: ${teacherLabel}`,
                topicLabel !== "שיעור פזצט״א" ? `סוג: ${topicLabel}` : null,
              ]
                .filter(Boolean)
                .join("\n");
              return (
                <li key={l.id} className="p-4 hover:bg-[var(--color-bg-muted)]/50 transition-colors">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-text)]">
                        {formatLessonDate(l.date)} {l.startTime}–{l.endTime}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {studentLabel}
                      </p>
                      {l.questionFromStudent && (
                        <p className="text-sm text-[var(--color-text)] mt-1">
                          שאלה: {l.questionFromStudent}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {l.status === "scheduled" && isLessonStarted(l.date, l.startTime) && !l.summary && (
                        <Link
                          href={`/teacher/lesson/${l.id}/report`}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90"
                        >
                          מלא דוח שיעור
                        </Link>
                      )}
                      {l.status === "scheduled" && (
                        <button
                          type="button"
                          onClick={() => handleCancel(l.id)}
                          disabled={!!cancelingId}
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius-input)] border border-amber-500 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                        >
                          {cancelingId === l.id ? "מבטל…" : "בטל שיעור"}
                        </button>
                      )}
                      {l.status === "scheduled" && !isLessonStarted(l.date, l.startTime) && (
                        <button
                          type="button"
                          onClick={() =>
                            addToCalendar({
                              date: l.date,
                              startTime: l.startTime,
                              endTime: l.endTime,
                              title: calendarTitle,
                              description: calendarDescription,
                              attendees: [l.student.email, "admin@pazatsta.co.il"],
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                          הוסף ללוח השנה
                        </button>
                      )}
                      {l.status === "scheduled" && isLessonStarted(l.date, l.startTime) && l.summary && (
                        <a
                          href={l.summary?.pdfUrl ?? `/api/pdf/lesson-summaries/lesson-${l.id}.pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--color-primary)] hover:underline"
                        >
                          צפייה ב-PDF
                        </a>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          l.status === "pending_approval"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                        }`}
                      >
                        {getStatusLabel(l.status)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {hasPast && (
        <section>
          <h3 className="text-lg font-semibold text-[var(--color-text)] mb-3">
            שיעורים שעברו
          </h3>
          <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white overflow-hidden shadow-[var(--shadow-card)]">
            {past.map((l) => {
              const hasReport = !!l.summary;
              return (
                <li key={l.id} className="p-4 hover:bg-[var(--color-bg-muted)]/50 transition-colors">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-[var(--color-text)]">
                        {formatLessonDate(l.date)} {l.startTime}–{l.endTime}
                      </p>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        {l.student.name || l.student.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {hasReport ? (
                        <>
                          <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            דוח הושלם
                          </span>
                          {l.followUpCompletedAt ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                              מעקב הושלם
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              {(l.student.screeningDate || l.student.screeningType) && (
                                <span className="text-xs text-[var(--color-text-muted)]">
                                  תאריך מיון: {l.student.screeningDate
                                    ? new Date(l.student.screeningDate + "T12:00:00").toLocaleDateString("he-IL")
                                    : "—"}
                                  {l.student.screeningType ? ` (${l.student.screeningType})` : ""}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleFollowUpComplete(l.id)}
                                disabled={followUpLoadingId === l.id}
                                className="px-3 py-1.5 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] disabled:opacity-50"
                              >
                                {followUpLoadingId === l.id ? "שולח…" : "סימון מעקב הושלם"}
                              </button>
                            </div>
                          )}
                          {(l.summary?.pdfUrl || l.summary) && (
                            <a
                              href={l.summary?.pdfUrl ?? `/api/pdf/lesson-summaries/lesson-${l.id}.pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-[var(--color-primary)] hover:underline"
                            >
                              צפייה ב-PDF
                            </a>
                          )}
                        </>
                      ) : (() => {
                        const isApproved = l.status === "scheduled";
                        const lessonStarted = isLessonStarted(l.date, l.startTime);
                        const canFillReport = isApproved && lessonStarted;
                        if (!canFillReport) {
                          const msg = !isApproved
                            ? "השיעור לא אושר"
                            : "אפשר למלא דוח רק אחרי תחילת השיעור";
                          return (
                            <span className="text-sm text-red-600">
                              {msg}
                            </span>
                          );
                        }
                        return (
                          <>
                            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              חסר דוח
                            </span>
                            <Link
                              href={`/teacher/lesson/${l.id}/report`}
                              className="px-3 py-1.5 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90"
                            >
                              מלא דוח שיעור
                            </Link>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
