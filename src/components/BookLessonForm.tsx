"use client";

import { useState } from "react";

type Slot = { id: string; date: string; startTime: string; endTime: string };
type Teacher = { id: string; email: string; name: string | null };

type Props = {
  slot: Slot;
  teacher: Teacher;
  onDone: () => void;
  onCancel: () => void;
};

export function BookLessonForm({ slot, teacher, onDone, onCancel }: Props) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [questionFromStudent, setQuestionFromStudent] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setMessage("Name, phone and email required.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/lessons/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityId: slot.id,
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          questionFromStudent: questionFromStudent.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Booking failed");
        setStatus("error");
        return;
      }
      setStatus("success");
      setMessage("Booked! Check your email.");
      setTimeout(onDone, 2000);
    } catch {
      setMessage("Network error");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-3 p-4 bg-green-50 rounded-lg">
        <p className="text-green-800 font-medium">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 p-4 bg-gray-50 rounded-lg space-y-3">
      <p className="text-sm text-gray-600">
        Book: {slot.date} {slot.startTime}–{slot.endTime} with {teacher.name || teacher.email}
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Student email (must have an account)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Question for teacher (optional)
        </label>
        <input
          type="text"
          value={questionFromStudent}
          onChange={(e) => setQuestionFromStudent(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-red-600" : "text-gray-600"}`}>
          {message}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded disabled:opacity-50"
        >
          {status === "loading" ? "Booking…" : "Book lesson"}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 border text-sm rounded">
          Cancel
        </button>
      </div>
    </form>
  );
}
