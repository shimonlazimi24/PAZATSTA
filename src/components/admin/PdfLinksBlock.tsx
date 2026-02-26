"use client";

import { useState } from "react";

type PdfLink = {
  id: string;
  lessonId: string | null;
  recipientEmail: string | null;
  isRevoked: boolean;
  createdAt: string;
  lastAccessedAt: string | null;
  accessCount: number;
};

export function PdfLinksBlock() {
  const [lessonId, setLessonId] = useState("");
  const [links, setLinks] = useState<PdfLink[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState<string | null>(null);

  async function fetchLinks() {
    if (!lessonId.trim()) return;
    setLoading(true);
    setError("");
    setLinks(null);
    setNewUrl(null);
    try {
      const res = await fetch(`/api/admin/pdf-links?lessonId=${encodeURIComponent(lessonId.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setLinks(data.links || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה בטעינה");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(linkId: string) {
    setActionLoading(linkId);
    try {
      const res = await fetch("/api/admin/pdf-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", linkId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      await fetchLinks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setActionLoading(null);
    }
  }

  async function regenerate() {
    if (!lessonId.trim()) return;
    setActionLoading("regenerate");
    setNewUrl(null);
    try {
      const res = await fetch("/api/admin/pdf-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate", lessonId: lessonId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "שגיאה");
      setNewUrl(data.publicUrl || null);
      await fetchLinks();
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="max-w-xl space-y-4" dir="rtl">
      <h2 className="text-xl font-bold text-[var(--color-text)]">ניהול קישורי דוחות PDF</h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        הזינו מזהה שיעור כדי לראות קישורים ציבוריים, לבטל קישור שדלף או ליצור קישור חדש.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
          placeholder="מזהה שיעור (lesson ID)"
          className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-input)] text-sm"
        />
        <button
          type="button"
          onClick={fetchLinks}
          disabled={loading || !lessonId.trim()}
          className="px-4 py-2 rounded-[var(--radius-input)] bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? "טוען…" : "חפש"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {newUrl && (
        <div className="p-3 rounded-[var(--radius-input)] bg-green-50 border border-green-200">
          <p className="text-sm font-medium text-green-800 mb-1">קישור חדש נוצר:</p>
          <a
            href={newUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-700 underline break-all"
          >
            {newUrl}
          </a>
        </div>
      )}
      {links && (
        <div className="space-y-2">
          {links.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">לא נמצאו קישורים לשיעור זה.</p>
          ) : (
            links.map((link) => (
              <div
                key={link.id}
                className="p-3 rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white flex flex-wrap items-center justify-between gap-2"
              >
                <div className="text-sm">
                  <span className={link.isRevoked ? "text-red-600 line-through" : "text-[var(--color-text)]"}>
                    {link.isRevoked ? "בוטל" : "פעיל"}
                  </span>
                  {link.recipientEmail && (
                    <span className="text-[var(--color-text-muted)] mr-2"> • {link.recipientEmail}</span>
                  )}
                  <span className="text-[var(--color-text-muted)]">
                    {" "}• גישות: {link.accessCount}
                    {link.lastAccessedAt && ` • אחרון: ${new Date(link.lastAccessedAt).toLocaleDateString("he-IL")}`}
                  </span>
                </div>
                {!link.isRevoked && (
                  <button
                    type="button"
                    onClick={() => revoke(link.id)}
                    disabled={!!actionLoading}
                    className="px-2 py-1 rounded text-sm border border-red-300 text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    {actionLoading === link.id ? "…" : "בטל קישור"}
                  </button>
                )}
              </div>
            ))
          )}
          {links.some((l) => !l.isRevoked) && (
            <button
              type="button"
              onClick={regenerate}
              disabled={!!actionLoading}
              className="px-4 py-2 rounded-[var(--radius-input)] border border-[var(--color-border)] text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] disabled:opacity-50"
            >
              {actionLoading === "regenerate" ? "יוצר…" : "צור קישור חדש (מבטל ישנים)"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
