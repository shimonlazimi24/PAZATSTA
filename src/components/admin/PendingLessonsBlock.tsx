"use client";

import { useState, useEffect } from "react";
import { apiJson } from "@/lib/api";

type PendingLesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  approvalExpiresAt: string | null;
  teacher: { id: string; email: string; name: string | null };
  student: { id: string; email: string; name: string | null };
  workshopName?: string | null;
  isWorkshop?: boolean;
};

export function PendingLessonsBlock() {
  const [lessons, setLessons] = useState<PendingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectingAll, setRejectingAll] = useState(false);
  const [rejectedMessage, setRejectedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function fetchPending(silent = false) {
    if (!silent) setLoading(true);
    apiJson<PendingLesson[]>("/api/admin/pending-lessons")
      .then((r) => {
        if (r.ok) setLessons(r.data);
        else setLessons([]);
      })
      .finally(() => { if (!silent) setLoading(false); });
  }

  useEffect(() => {
    fetchPending();
    // Poll only while the tab is visible. A dashboard left open overnight was
    // issuing ~1,000 queries nobody was there to read.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchPending(true);
    }, 30_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchPending(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  function handleApprove(id: string) {
    setApprovingId(id);
    setErrorMessage(null);
    apiJson<{ ok?: boolean; error?: string }>(`/api/lessons/${id}/approve`, { method: "POST" })
      .then((r) => {
        if (r.ok) {
          fetchPending();
        } else {
          const msg = r.error ?? "אישור נכשל";
          setErrorMessage(msg);
          fetchPending();
        }
      })
      .finally(() => setApprovingId(null));
  }

  async function handleRejectAllExpired() {
    const expired = lessons.filter(
      (l) => l.approvalExpiresAt && new Date(l.approvalExpiresAt) < new Date()
    );
    if (expired.length === 0) return;
    setRejectingAll(true);
    setErrorMessage(null);
    let rejected = 0;
    for (const l of expired) {
      const r = await apiJson(`/api/lessons/${l.id}/reject`, { method: "POST" });
      if (r.ok) rejected++;
    }
    setRejectedMessage(`בוטלו ${rejected} שיעורים שפג תוקפם`);
    setTimeout(() => setRejectedMessage(null), 5000);
    fetchPending();
    setRejectingAll(false);
  }

  function handleReject(id: string) {
    setRejectingId(id);
    setRejectedMessage(null);
    setErrorMessage(null);
    apiJson<{ ok?: boolean; error?: string }>(`/api/lessons/${id}/reject`, { method: "POST" })
      .then((r) => {
        if (r.ok) {
          setRejectedMessage("הבקשה לא אושרה והשיעור בוטל.");
          setTimeout(() => setRejectedMessage(null), 4000);
          fetchPending();
        } else {
          const msg = r.error ?? "דחייה נכשלה";
          setErrorMessage(msg);
          fetchPending();
        }
      })
      .finally(() => setRejectingId(null));
  }

  const now = Date.now();
  const timeLeft = (iso: string | null | undefined) => {
    if (!iso) return null;
    const h = (new Date(iso).getTime() - now) / 3_600_000;
    if (h <= 0) return { text: "פג הזמן, תבוטל בדקות הקרובות", urgent: true };
    if (h < 1) return { text: "מתבטלת בפחות משעה", urgent: true };
    return { text: `מתבטלת אוטומטית בעוד ${Math.floor(h)} שעות`, urgent: h <= 6 };
  };
  const dateLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const expiredCount = lessons.filter((l) => l.approvalExpiresAt && new Date(l.approvalExpiresAt).getTime() < now).length;

  if (loading) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;

  return (
    <div className="space-y-4" dir="rtl">
      {rejectedMessage && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{rejectedMessage}</p>
      )}
      {errorMessage && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      )}

      {lessons.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-white px-5 py-8 text-center text-[var(--color-text)]">
          אין בקשות שממתינות לאישור.
          <span className="mt-1 block text-sm text-[var(--color-text-muted)]">בקשה חדשה מתלמיד תופיע כאן, והמורה מקבל עליה מייל.</span>
        </p>
      ) : (
        <>
          {expiredCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>{expiredCount === 1 ? "בקשה אחת עברה" : `${expiredCount} בקשות עברו`} את 24 השעות לאישור.</span>
              <button type="button" disabled={rejectingAll || !!rejectingId || !!approvingId} onClick={handleRejectAllExpired} className="font-medium underline disabled:opacity-50">
                {rejectingAll ? "מבטל…" : "לבטל אותן עכשיו"}
              </button>
            </div>
          )}
          <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-white">
            {lessons.map((l) => {
              const left = timeLeft(l.approvalExpiresAt);
              return (
                <li key={l.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <p className="font-medium text-[var(--color-text)]">
                      {dateLabel(l.date)}, <span className="tabular-nums">{l.startTime}–{l.endTime}</span>
                    </p>
                    <p className="text-sm text-[var(--color-text)]">
                      {l.student.name || l.student.email}
                      <span className="text-[var(--color-text-muted)]"> עם {l.teacher.name || l.teacher.email}</span>
                      {l.isWorkshop && <span className="text-[var(--color-text-muted)]">, סדנה{l.workshopName ? ` ${l.workshopName}` : ""}</span>}
                    </p>
                    {left && <p className={`text-xs ${left.urgent ? "font-medium text-amber-800" : "text-[var(--color-text-muted)]"}`}>{left.text}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      disabled={!!approvingId || !!rejectingId}
                      onClick={() => handleApprove(l.id)}
                      className="min-h-[40px] rounded-md bg-[var(--color-primary)] px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {approvingId === l.id ? "מאשר…" : "אישור"}
                    </button>
                    <button
                      type="button"
                      disabled={!!approvingId || !!rejectingId}
                      onClick={() => {
                        if (confirm("לא לאשר את הבקשה? השיעור יבוטל והמשבצת תחזור לזמינות.")) handleReject(l.id);
                      }}
                      className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:underline disabled:opacity-50"
                    >
                      {rejectingId === l.id ? "מבטל…" : "לא לאשר"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
