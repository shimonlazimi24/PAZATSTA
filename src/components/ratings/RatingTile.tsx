"use client";

import { useState } from "react";
import type { RatingItem } from "@/lib/ratings";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("he-IL", { day: "numeric", month: "numeric", year: "2-digit", timeZone: "Asia/Jerusalem" });
}

/** One uploaded photo or video, with its date and a two-step delete. */
export function RatingTile({ item, onDelete }: { item: RatingItem; onDelete: (id: string) => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <li className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
      <div className="aspect-square bg-[var(--color-bg-muted)]">
        {item.kind === "video" ? (
          <video src={item.url} controls preload="metadata" playsInline className="h-full w-full object-contain" />
        ) : (
          <a href={item.url} target="_blank" rel="noreferrer" aria-label="פתיחת התמונה בגודל מלא">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="דירוג שהועלה" loading="lazy" className="h-full w-full object-contain" />
          </a>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-[var(--color-text-muted)]">
        <span>
          {item.kind === "video" ? "סרטון" : "תמונה"} · {dateLabel(item.createdAt)}
        </span>
        {confirm ? (
          <span className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onDelete(item.id);
                setBusy(false);
                setConfirm(false);
              }}
              className="font-medium text-red-700 hover:underline disabled:opacity-50"
            >
              {busy ? "מוחק…" : "למחוק"}
            </button>
            <button type="button" onClick={() => setConfirm(false)} className="hover:underline">
              ביטול
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} className="text-red-700 hover:underline">
            מחיקה
          </button>
        )}
      </div>
    </li>
  );
}
