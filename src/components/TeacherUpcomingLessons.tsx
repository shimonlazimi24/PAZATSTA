"use client";

import { useState, useEffect } from "react";
import { CompleteLessonForm } from "./CompleteLessonForm";

type Lesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  questionFromStudent: string | null;
  student: { id: string; email: string; name: string | null };
  summary: { pdfUrl: string | null } | null;
};

export function TeacherUpcomingLessons() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teacher/lessons?upcoming=true")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLessons)
      .finally(() => setLoading(false));
  }, []);

  function onCompleted() {
    setCompletingId(null);
    fetch("/api/teacher/lessons?upcoming=true")
      .then((r) => (r.ok ? r.json() : []))
      .then(setLessons);
  }

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (lessons.length === 0)
    return (
      <p className="text-sm text-gray-500">No upcoming lessons. Students book from their dashboard.</p>
    );

  return (
    <ul className="divide-y divide-gray-200">
      {lessons.map((l) => (
        <li key={l.id} className="py-3 first:pt-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="font-medium text-gray-900">
                {l.date} {l.startTime}–{l.endTime}
              </p>
              <p className="text-sm text-gray-500">
                {l.student.name || l.student.email}
              </p>
              {l.questionFromStudent && (
                <p className="text-sm text-gray-600 mt-1">
                  Question: {l.questionFromStudent}
                </p>
              )}
            </div>
            {l.status === "scheduled" && (
              <button
                type="button"
                onClick={() => setCompletingId(l.id)}
                className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-800"
              >
                Complete lesson
              </button>
            )}
            {l.status === "completed" && l.summary?.pdfUrl && (
              <a
                href={l.summary.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:underline"
              >
                View PDF
              </a>
            )}
          </div>
          {completingId === l.id && (
            <CompleteLessonForm
              lessonId={l.id}
              onDone={onCompleted}
              onCancel={() => setCompletingId(null)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
