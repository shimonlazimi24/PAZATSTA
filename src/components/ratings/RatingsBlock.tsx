"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { apiJson } from "@/lib/api";
import { fileProblem, type RatingItem, type RatingMode } from "@/lib/ratings";
import { RatingTile } from "./RatingTile";

/** Keeps the name short and plain; storage adds a random ending so names never clash. */
function safeName(name: string): string {
  const ext = (name.match(/\.[a-z0-9]{2,5}$/i)?.[0] ?? "").toLowerCase();
  return `file${ext}`;
}

/**
 * "דירוגים" on the teacher's dashboard: upload a photo or a video of a rating,
 * and see what was already uploaded. The admin sees the same files per teacher.
 */
export function RatingsBlock() {
  const [mode, setMode] = useState<RatingMode | null>(null);
  const [items, setItems] = useState<RatingItem[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number; pct: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const folder = useRef<string>("");

  const load = useCallback(async () => {
    const r = await apiJson<{ mode: RatingMode; folder: string; items: RatingItem[] }>("/api/teacher/ratings");
    if (!r.ok) return setMode("off");
    folder.current = r.data.folder;
    setMode(r.data.mode);
    setItems(r.data.items);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function sendOne(file: File, onPct: (pct: number) => void): Promise<string | null> {
    const problem = fileProblem(file.type, file.size);
    if (problem) return problem;
    if (mode === "local") {
      const body = new FormData();
      body.append("file", file);
      const r = await apiJson("/api/teacher/ratings/local", { method: "POST", body });
      return r.ok ? null : r.error;
    }
    try {
      const blob = await upload(`${folder.current}${safeName(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/teacher/ratings/token",
        contentType: file.type,
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: (e) => onPct(Math.round(e.percentage)),
      });
      const r = await apiJson("/api/teacher/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url }),
      });
      return r.ok ? null : r.error;
    } catch {
      return "ההעלאה נכשלה. בדקו את החיבור לאינטרנט ונסו שוב.";
    }
  }

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (input.current) input.current.value = "";
    if (files.length === 0) return;
    setMsg(null);
    let failed: string | null = null;
    let sent = 0;
    for (let i = 0; i < files.length; i++) {
      setProgress({ done: i, total: files.length, pct: 0 });
      const err = await sendOne(files[i], (pct) => setProgress({ done: i, total: files.length, pct }));
      if (err) failed = err;
      else sent++;
    }
    setProgress(null);
    await load();
    if (failed) setMsg({ ok: false, text: sent ? `עלו ${sent} מתוך ${files.length}. ${failed}` : failed });
    else setMsg({ ok: true, text: sent === 1 ? "הקובץ עלה." : `עלו ${sent} קבצים.` });
  }

  async function remove(id: string) {
    const r = await apiJson(`/api/teacher/ratings/${id}`, { method: "DELETE" });
    if (!r.ok) return setMsg({ ok: false, text: r.error || "המחיקה נכשלה" });
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (!mode || mode === "off") return null;
  const images = items.filter((i) => i.kind === "image").length;

  return (
    <section id="teacher-ratings" aria-labelledby="ratings-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="ratings-title" className="text-xl font-bold text-[var(--color-text)]">
            דירוגים
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            {items.length === 0
              ? "העלו תמונה או סרטון של דירוג שקיבלתם."
              : `העליתם ${items.length}: ${images} תמונות, ${items.length - images} סרטונים.`}
          </p>
        </div>
        <button
          type="button"
          disabled={!!progress}
          onClick={() => input.current?.click()}
          className="min-h-[44px] rounded-[var(--radius-input)] bg-[var(--color-primary)] px-5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {progress
            ? `מעלה ${progress.total > 1 ? `${progress.done + 1} מתוך ${progress.total} · ` : ""}${progress.pct}%`
            : "העלאת תמונה או סרטון"}
        </button>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`} role={msg.ok ? "status" : "alert"}>
          {msg.text}
        </p>
      )}

      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((i) => (
            <RatingTile key={i.id} item={i} onDelete={remove} />
          ))}
        </ul>
      )}
    </section>
  );
}
