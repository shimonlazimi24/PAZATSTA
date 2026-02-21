"use client";

import { useState } from "react";

type Props = {
  lessonId: string;
  onDone: () => void;
  onCancel: () => void;
};

export function CompleteLessonForm({ lessonId, onDone, onCancel }: Props) {
  const [summaryText, setSummaryText] = useState("");
  const [homeworkText, setHomeworkText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!summaryText.trim() && !homeworkText.trim()) {
      setError("נא למלא סיכום או משימות בית.");
      return;
    }
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(
        `/api/teacher/lessons/${lessonId}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summaryText: summaryText.trim(),
            homeworkText: homeworkText.trim(),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed");
        setStatus("error");
        return;
      }
      onDone();
    } catch {
      setError("Network error");
      setStatus("error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          סיכום השיעור
        </label>
        <textarea
          value={summaryText}
          onChange={(e) => setSummaryText(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="מה נלמד בשיעור?"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          משימות בית
        </label>
        <textarea
          value={homeworkText}
          onChange={(e) => setHomeworkText(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          placeholder="תרגול והכנה לשיעור הבא"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded disabled:opacity-50"
        >
          {status === "loading" ? "שולח…" : "שליחה ושליחת PDF"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 border border-gray-300 text-sm rounded"
        >
          ביטול
        </button>
      </div>
    </form>
  );
}
