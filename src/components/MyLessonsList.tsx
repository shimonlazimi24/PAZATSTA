"use client";

import { useState, useEffect } from "react";

type Lesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  teacher: { id: string; email: string; name: string | null };
  student?: { id: string; email: string; name: string | null };
  summary: { pdfUrl: string | null } | null;
};

type Props = {
  apiPath: string;
  emptyMessage?: string;
  showStudent?: boolean;
};

export function MyLessonsList({ apiPath, emptyMessage = "No lessons.", showStudent }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(apiPath)
      .then((r) => (r.ok ? r.json() : []))
      .then(setLessons)
      .finally(() => setLoading(false));
  }, [apiPath]);

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (lessons.length === 0) return <p className="text-sm text-gray-500">{emptyMessage}</p>;

  return (
    <ul className="divide-y divide-gray-200">
      {lessons.map((l) => (
        <li key={l.id} className="py-3 first:pt-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="font-medium text-gray-900">
                {new Date(l.date + "T12:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}{" "}
                {l.startTime}–{l.endTime}
              </p>
              <p className="text-sm text-gray-500">
                with {l.teacher.name || l.teacher.email}
                {showStudent && l.student && (
                  <> · {l.student.name || l.student.email}</>
                )}
              </p>
              <p className="text-xs text-gray-400">{l.status}</p>
            </div>
            {l.summary?.pdfUrl && (
              <a
                href={l.summary.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:underline shrink-0"
              >
                Download PDF
              </a>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
