"use client";

import { useState, useEffect } from "react";

type Student = { id: string; email: string; name: string | null };

type ScheduleLessonFormProps = {
  onScheduled?: () => void;
};

export function ScheduleLessonForm({ onScheduled }: ScheduleLessonFormProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentId, setStudentId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/teacher/students")
      .then((res) => res.ok ? res.json() : [])
      .then(setStudents)
      .catch(() => setStudents([]));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !date || !time) {
      setMessage("Select student, date and time.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage("");
    const startsAt = new Date(`${date}T${time}`);
    if (isNaN(startsAt.getTime())) {
      setStatus("error");
      setMessage("Invalid date or time.");
      return;
    }
    try {
      const res = await fetch("/api/teacher/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          startsAt: startsAt.toISOString(),
          durationMinutes,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to schedule.");
        return;
      }
      setStatus("success");
      setMessage("Lesson scheduled.");
      setDate("");
      setTime("09:00");
      setNotes("");
      onScheduled?.();
    } catch {
      setStatus("error");
      setMessage("Network error.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm space-y-4"
    >
      <h3 className="font-semibold text-gray-900">Schedule a lesson</h3>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Student
        </label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
          disabled={status === "loading"}
        >
          <option value="">Select student</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || s.email}
            </option>
          ))}
        </select>
        {students.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">No students yet. Ask admin to invite students.</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            value={date}
            min={today}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            disabled={status === "loading"}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time
          </label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            disabled={status === "loading"}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duration (minutes)
        </label>
        <select
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
          disabled={status === "loading"}
        >
          <option value={30}>30</option>
          <option value={45}>45</option>
          <option value={60}>60</option>
          <option value={90}>90</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes (optional)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Topic: chords"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
          disabled={status === "loading"}
        />
      </div>
      {message && (
        <p
          className={`text-sm ${
            status === "success" ? "text-green-600" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "loading" || students.length === 0}
        className="w-full py-2 rounded-md bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-50"
      >
        {status === "loading" ? "Scheduling…" : "Schedule lesson"}
      </button>
    </form>
  );
}
