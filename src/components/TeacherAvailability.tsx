"use client";

import { useState, useEffect, useCallback } from "react";

type Slot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

function getWeekRange(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d);
  mon.setDate(diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    start: mon.toISOString().slice(0, 10),
    end: sun.toISOString().slice(0, 10),
  };
}

export function TeacherAvailability() {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("09:45");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    const { start, end } = getWeekRange(new Date(weekStart));
    setLoading(true);
    fetch(`/api/teacher/availability?start=${start}&end=${end}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSlots)
      .finally(() => setLoading(false));
  }, [weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate || !newStart || !newEnd) return;
    setSubmitting(true);
    try {
      await fetch("/api/teacher/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newDate,
          startTime: newStart,
          endTime: newEnd,
        }),
      });
      setNewDate("");
      load();
    } finally {
      setSubmitting(false);
    }
  }

  async function removeSlot(id: string) {
    await fetch(`/api/teacher/availability?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Week starting</label>
        <input
          type="date"
          value={weekStart}
          onChange={(e) => setWeekStart(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-md"
        />
      </div>
      <form onSubmit={addSlot} className="flex flex-wrap items-end gap-2 p-3 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-xs text-gray-500">Date</label>
          <input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            className="px-2 py-1.5 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Start</label>
          <input
            type="time"
            value={newStart}
            onChange={(e) => setNewStart(e.target.value)}
            className="px-2 py-1.5 border rounded text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500">End</label>
          <input
            type="time"
            value={newEnd}
            onChange={(e) => setNewEnd(e.target.value)}
            className="px-2 py-1.5 border rounded text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded disabled:opacity-50"
        >
          Add slot
        </button>
      </form>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100">
          {slots.length === 0 ? (
            <li className="p-4 text-sm text-gray-500 text-center">
              No slots this week. Add slots above.
            </li>
          ) : (
            slots.map((slot) => (
              <li
                key={slot.id}
                className="px-4 py-2 flex justify-between items-center"
              >
                <span className="text-sm">
                  {new Date(slot.date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  {slot.startTime}–{slot.endTime}
                </span>
                <button
                  type="button"
                  onClick={() => removeSlot(slot.id)}
                  className="text-red-600 hover:underline text-xs"
                >
                  Remove
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
