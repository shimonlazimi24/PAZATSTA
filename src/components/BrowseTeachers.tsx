"use client";

import { useState, useEffect } from "react";
import { BookLessonForm } from "./BookLessonForm";

type Teacher = {
  id: string;
  email: string;
  name: string | null;
  bio: string | null;
};

type Slot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
};

export function BrowseTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);

  useEffect(() => {
    fetch("/api/teachers")
      .then((r) => (r.ok ? r.json() : []))
      .then(setTeachers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTeacher) {
      setSlots([]);
      return;
    }
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 14);
    fetch(
      `/api/teachers/${selectedTeacher.id}/availability?start=${start.toISOString().slice(0, 10)}&end=${end.toISOString().slice(0, 10)}`
    )
      .then((r) => (r.ok ? r.json() : []))
      .then(setSlots);
  }, [selectedTeacher]);

  if (loading) return <p className="text-sm text-gray-500">Loading teachers…</p>;
  if (teachers.length === 0)
    return <p className="text-sm text-gray-500">No teachers yet.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">Teachers</h3>
        <ul className="space-y-2">
          {teachers.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedTeacher(t);
                  setBookingSlot(null);
                }}
                className={`w-full text-left px-3 py-2 rounded border ${
                  selectedTeacher?.id === t.id
                    ? "border-gray-900 bg-gray-50"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="font-medium">{t.name || t.email}</span>
                {t.bio && (
                  <p className="text-sm text-gray-500 mt-0.5">{t.bio}</p>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {selectedTeacher && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Available slots — {selectedTeacher.name || selectedTeacher.email}
          </h3>
          {slots.length === 0 ? (
            <p className="text-sm text-gray-500">No available slots in the next 2 weeks.</p>
          ) : (
            <ul className="space-y-1">
              {slots.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setBookingSlot(s)}
                    className="text-sm text-gray-700 hover:underline"
                  >
                    {new Date(s.date + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    {s.startTime}–{s.endTime}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {bookingSlot && (
            <BookLessonForm
              slot={bookingSlot}
              teacher={selectedTeacher}
              onDone={() => setBookingSlot(null)}
              onCancel={() => setBookingSlot(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
