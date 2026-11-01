"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { addDaysYYYYMMDD, isLessonStarted } from "@/lib/dates";

type WeeklyLesson = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending_approval" | "scheduled" | "completed" | string;
  topic: string | null;
  isWorkshop: boolean;
  teacher: { id: string; email: string; name: string | null };
  student: { id: string; email: string; name: string | null };
};

type WeeklyEvent = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  place: string;
  topic?: string;
  teachersNeeded: number;
  teachers: { id: string; name: string }[];
};
type Events = { groupLessons: WeeklyEvent[]; frontalDays: WeeklyEvent[] };

/** One row on the board, whatever its kind. */
type Row =
  | { kind: "private"; date: string; startTime: string; lesson: WeeklyLesson }
  | { kind: "group" | "frontal"; date: string; startTime: string; event: WeeklyEvent };

type Kind = Row["kind"];
const KINDS: { key: Kind | "all"; label: string }[] = [
  { key: "all", label: "הכול" },
  { key: "private", label: "שיעורים פרטיים" },
  { key: "group", label: "שיעורים קבוצתיים" },
  { key: "frontal", label: "ימים פרונטליים" },
];
const KIND_BADGE: Record<"group" | "frontal", { label: string; cls: string; href: (id: string) => string }> = {
  group: { label: "קבוצתי", cls: "bg-sky-50 text-sky-800", href: (id) => `/admin/group-lessons/${id}` },
  frontal: { label: "פרונטלי", cls: "bg-violet-50 text-violet-800", href: (id) => `/admin/frontal-days/${id}` },
};

const rowTeacherIds = (r: Row) => (r.kind === "private" ? [r.lesson.teacher.id] : r.event.teachers.map((t) => t.id));

const todayIL = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jerusalem" });

/** Sunday of the week containing dateStr, computed on calendar dates (no local-clock drift). */
function sundayOf(dateStr: string): string {
  const weekday = new Date(`${dateStr}T12:00:00Z`).getUTCDay();
  return addDaysYYYYMMDD(dateStr, -weekday);
}

const dayHeading = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const rangeLabel = (start: string) => {
  const a = new Date(`${start}T12:00:00Z`);
  const b = new Date(`${addDaysYYYYMMDD(start, 6)}T12:00:00Z`);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  const opts = { day: "numeric", month: "long", timeZone: "UTC" } as const;
  return sameMonth
    ? `${a.getUTCDate()}–${b.toLocaleDateString("he-IL", opts)}`
    : `${a.toLocaleDateString("he-IL", opts)} – ${b.toLocaleDateString("he-IL", opts)}`;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending_approval: { label: "ממתין לאישור", cls: "bg-amber-50 text-amber-800" },
  scheduled: { label: "מאושר", cls: "bg-[var(--color-bg-muted)] text-[var(--color-text)]" },
  completed: { label: "הושלם", cls: "bg-green-50 text-green-800" },
};

const actionBtn = "text-sm text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline disabled:opacity-50";

const rowGrid = "grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[5.5rem_1fr_auto] sm:items-center";

type Act = (lesson: WeeklyLesson, action: "cancel" | "reject" | "not-held") => void;

function PrivateRow({ l, busy, act }: { l: WeeklyLesson; busy: boolean; act: Act }) {
  const status = STATUS[l.status] ?? { label: l.status, cls: "bg-[var(--color-bg-muted)]" };
  const started = isLessonStarted(l.date, l.startTime);
  return (
    <li className={rowGrid}>
      <span className="text-sm font-medium tabular-nums text-[var(--color-text)]">
        {l.startTime}–{l.endTime}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-[var(--color-text)]">
          {l.student.name || l.student.email}
          <span className="text-[var(--color-text-muted)]"> עם {l.teacher.name || l.teacher.email}</span>
        </span>
        {(l.topic || l.isWorkshop) && <span className="block truncate text-xs text-[var(--color-text-muted)]">{l.isWorkshop ? "סדנה" : l.topic}</span>}
      </span>
      <span className="flex flex-wrap items-center gap-3">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${status.cls}`}>{status.label}</span>
        {l.status === "pending_approval" && (
          <button type="button" disabled={busy} className={actionBtn} onClick={() => act(l, "reject")}>
            לא לאשר
          </button>
        )}
        {l.status === "scheduled" && !started && (
          <button type="button" disabled={busy} className={actionBtn} onClick={() => act(l, "cancel")}>
            ביטול
          </button>
        )}
        {/* Once the time has passed, "canceled" (email, slot freed) no longer fits; "not held" does. */}
        {(l.status === "completed" || (l.status === "scheduled" && started)) && (
          <button type="button" disabled={busy} className={actionBtn} onClick={() => act(l, "not-held")}>
            לא התקיים
          </button>
        )}
      </span>
    </li>
  );
}

/** A group lesson or a frontal day: who teaches it, whether teachers are missing, and a link to manage it. */
function EventRow({ kind, e }: { kind: "group" | "frontal"; e: WeeklyEvent }) {
  const badge = KIND_BADGE[kind];
  const missing = e.teachersNeeded - e.teachers.length;
  return (
    <li className={rowGrid}>
      <span className="text-sm font-medium tabular-nums text-[var(--color-text)]">
        {e.startTime}–{e.endTime}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm text-[var(--color-text)]">
          {e.title}
          {e.place && <span className="text-[var(--color-text-muted)]">, {e.place}</span>}
        </span>
        <span className={`block truncate text-xs ${e.teachers.length === 0 ? "font-medium text-amber-800" : "text-[var(--color-text-muted)]"}`}>
          {e.teachers.length === 0 ? "אין מורים עדיין" : `מורים: ${e.teachers.map((t) => t.name).join(", ")}`}
          {e.teachers.length > 0 && missing > 0 && <span className="font-medium text-amber-800">{missing === 1 ? ", חסר מורה אחד" : `, חסרים ${missing} מורים`}</span>}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-3">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
        <Link href={badge.href(e.id)} className="text-sm text-[var(--color-primary)] underline-offset-2 hover:underline">
          לפרטים
        </Link>
      </span>
    </li>
  );
}

export function AdminWeeklyCalendar() {
  const [weekStart, setWeekStart] = useState(() => sundayOf(todayIL()));
  const [lessons, setLessons] = useState<WeeklyLesson[] | null>(null);
  const [events, setEvents] = useState<Events>({ groupLessons: [], frontalDays: [] });
  const [eventsFailed, setEventsFailed] = useState(false);
  const [kind, setKind] = useState<Kind | "all">("all");
  const [teacherId, setTeacherId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async (start: string) => {
    const end = addDaysYYYYMMDD(start, 6);
    const get = (path: string) => fetch(`${path}?start=${start}&end=${end}`, { cache: "no-store", credentials: "include" });
    const [privateRes, eventsRes] = await Promise.allSettled([get("/api/admin/weekly-lessons"), get("/api/admin/weekly-events")]);
    try {
      setLessons(privateRes.status === "fulfilled" && privateRes.value.ok ? await privateRes.value.json() : []);
    } catch {
      setLessons([]);
    }
    try {
      if (eventsRes.status !== "fulfilled" || !eventsRes.value.ok) throw new Error();
      setEvents(await eventsRes.value.json());
      setEventsFailed(false);
    } catch {
      setEvents({ groupLessons: [], frontalDays: [] });
      setEventsFailed(true);
    }
  }, []);

  useEffect(() => {
    setLessons(null);
    load(weekStart);
  }, [weekStart, load]);

  async function act(lesson: WeeklyLesson, action: "cancel" | "reject" | "not-held") {
    const prompts = {
      cancel: "לבטל את השיעור? התלמיד והמורה יקבלו מייל, והמשבצת תחזור לזמינות.",
      reject: "לא לאשר את הבקשה? השיעור יבוטל והמשבצת תחזור לזמינות.",
      "not-held": "השיעור לא התקיים? הוא יוצא מסיכום השעות. הדוח שנשלח נשמר.",
    };
    if (!confirm(prompts[action])) return;
    setBusyId(lesson.id);
    setMessage(null);
    try {
      const r = await fetch(`/api/lessons/${lesson.id}/${action}`, { method: "POST", credentials: "include" });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) setMessage({ ok: false, text: data.error ?? "הפעולה לא הצליחה. נסו שוב." });
      else {
        setMessage({ ok: true, text: action === "reject" ? "הבקשה נדחתה." : action === "cancel" ? "השיעור בוטל." : "השיעור הוצא מסיכום השעות." });
        load(weekStart);
      }
    } catch {
      setMessage({ ok: false, text: "אין חיבור לאינטרנט. בדקו את החיבור ונסו שוב." });
    } finally {
      setBusyId(null);
    }
  }

  const today = todayIL();
  const days = Array.from({ length: 7 }, (_, i) => addDaysYYYYMMDD(weekStart, i));
  const isThisWeek = weekStart === sundayOf(today);
  const allRows: Row[] = [
    ...(lessons ?? []).map((l): Row => ({ kind: "private", date: l.date, startTime: l.startTime, lesson: l })),
    ...events.groupLessons.map((e): Row => ({ kind: "group", date: e.date, startTime: e.startTime, event: e })),
    ...events.frontalDays.map((e): Row => ({ kind: "frontal", date: e.date, startTime: e.startTime, event: e })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));
  // Everyone who teaches something this week, for the teacher filter.
  const weekTeachers = new Map<string, string>();
  for (const r of allRows) {
    if (r.kind === "private") weekTeachers.set(r.lesson.teacher.id, r.lesson.teacher.name || r.lesson.teacher.email);
    else for (const t of r.event.teachers) weekTeachers.set(t.id, t.name);
  }
  const byTeacher = teacherId ? allRows.filter((r) => rowTeacherIds(r).includes(teacherId)) : allRows;
  const rows = kind === "all" ? byTeacher : byTeacher.filter((r) => r.kind === kind);
  const countOf = (k: Kind | "all") => (k === "all" ? byTeacher.length : byTeacher.filter((r) => r.kind === k).length);
  const pending = rows.filter((r) => r.kind === "private" && r.lesson.status === "pending_approval").length;
  const filtered = kind !== "all" || teacherId !== "";
  const navBtn = "min-h-[36px] rounded-md border border-[var(--color-border)] bg-white px-3 text-sm hover:bg-[var(--color-bg-muted)]";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-[var(--color-text)]">{rangeLabel(weekStart)}</p>
          {lessons && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {rows.length === 0 ? "אין כלום" : rows.length === 1 ? "פריט אחד" : `${rows.length} פריטים`}
              {filtered && " לפי הסינון"}
              {pending > 0 && `, ${pending} ממתינים לאישור`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className={navBtn} onClick={() => setWeekStart(addDaysYYYYMMDD(weekStart, -7))}>
            השבוע הקודם
          </button>
          {!isThisWeek && (
            <button type="button" className={navBtn} onClick={() => setWeekStart(sundayOf(today))}>
              השבוע
            </button>
          )}
          <button type="button" className={navBtn} onClick={() => setWeekStart(addDaysYYYYMMDD(weekStart, 7))}>
            השבוע הבא
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="סינון לפי סוג">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            aria-pressed={kind === k.key}
            onClick={() => setKind(k.key)}
            className={`min-h-[36px] rounded-full border px-3 text-sm ${
              kind === k.key
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] font-medium text-white"
                : "border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-muted)]"
            }`}
          >
            {k.label}
            {lessons && <span className={`ms-1.5 tabular-nums ${kind === k.key ? "text-white/80" : "text-[var(--color-text-muted)]"}`}>{countOf(k.key)}</span>}
          </button>
        ))}
        <label className="ms-auto flex items-center gap-2 text-sm">
          <span className="text-[var(--color-text-muted)]">מורה</span>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="min-h-[36px] rounded-md border border-[var(--color-border)] bg-white px-2">
            <option value="">כל המורים</option>
            {[...weekTeachers.entries()]
              .sort((a, b) => a[1].localeCompare(b[1], "he"))
              .map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            {teacherId && !weekTeachers.has(teacherId) && <option value={teacherId}>מורה שנבחר</option>}
          </select>
        </label>
      </div>

      {eventsFailed && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800" role="alert">
          לא הצלחנו לטעון את השיעורים הקבוצתיים והימים הפרונטליים. השיעורים הפרטיים מוצגים כרגיל.
        </p>
      )}

      {message && (
        <p className={`rounded-md px-3 py-2 text-sm ${message.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`} role={message.ok ? "status" : "alert"}>
          {message.text}
        </p>
      )}

      {!lessons ? (
        <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>
      ) : (
        <ol className="space-y-4">
          {days.map((d) => {
            const dayRows = rows.filter((r) => r.date === d);
            const isToday = d === today;
            return (
              <li key={d} className={d < today ? "opacity-75" : ""}>
                <h3 className={`mb-1.5 text-sm font-semibold ${isToday ? "text-[var(--color-primary)]" : "text-[var(--color-text)]"}`}>
                  {dayHeading(d)}
                  {isToday && " (היום)"}
                </h3>
                {dayRows.length === 0 ? (
                  <p className="border-b border-[var(--color-border)] pb-3 text-sm text-[var(--color-text-muted)]">{filtered ? "אין כלום לפי הסינון" : "אין כלום"}</p>
                ) : (
                  <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-white">
                    {dayRows.map((r) => (r.kind === "private" ? <PrivateRow key={r.lesson.id} l={r.lesson} busy={busyId === r.lesson.id} act={act} /> : <EventRow key={r.event.id} kind={r.kind} e={r.event} />))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
