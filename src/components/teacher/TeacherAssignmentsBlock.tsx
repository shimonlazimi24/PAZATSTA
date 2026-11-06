"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, School, Users } from "lucide-react";

type GroupLesson = { id: string; date: string; startTime: string; endTime: string; location: string | null; typeLabel: string; mine: boolean; started: boolean; reported: boolean; status: string; placesLeft: number };
type GroupData = { month: string; requirement: { month: string; met: boolean }[]; awaitingReport: { id: string; date: string; startTime: string; typeLabel: string }[]; lessons: GroupLesson[] };
type FrontalDay = { id: string; title: string; date: string; startTime: string; address: string | null; mine: boolean; past: boolean; checklistTotal: number; checklistDone: number; reportStatus: string; status: string; placesLeft: number };

type Item = { key: string; kind: "group" | "frontal"; date: string; time: string; title: string; where: string | null; href: string; note?: string };
type Todo = { key: string; text: string; href: string };

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const monthName = (key: string) => MONTHS[Number(key.slice(5, 7)) - 1] ?? key;
const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("he-IL", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" });
};
const nextMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
};

async function getJson<T>(url: string): Promise<T | null> {
  const r = await fetch(url, { credentials: "include", cache: "no-store" }).catch(() => null);
  return r && r.ok ? ((await r.json().catch(() => null)) as T | null) : null;
}

/**
 * The teacher's group lessons and frontal days on their home page: what is
 * coming up, and what is waiting for them (signing up for the month, a report,
 * a checklist). The full pages stay one click away.
 */
export function TeacherAssignmentsBlock() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  // Places still open to sign up for, so every teacher can see and join.
  const [open, setOpen] = useState({ group: 0, frontal: 0 });

  useEffect(() => {
    (async () => {
      const group = await getJson<GroupData>("/api/teacher/group-lessons");
      const groupNext = group ? await getJson<GroupData>(`/api/teacher/group-lessons?month=${nextMonth(group.month)}`) : null;
      const days = (await getJson<FrontalDay[]>("/api/teacher/frontal-days")) ?? [];

      const list: Item[] = [];
      const todo: Todo[] = [];
      for (const l of [...(group?.lessons ?? []), ...(groupNext?.lessons ?? [])]) {
        if (!l.mine || l.started) continue;
        list.push({ key: `g${l.id}`, kind: "group", date: l.date, time: l.startTime, title: `שיעור קבוצתי · ${l.typeLabel}`, where: l.location, href: "/teacher/group-lessons" });
      }
      for (const d of days) {
        if (!d.mine) continue;
        if (!d.past) {
          const left = d.checklistTotal - d.checklistDone;
          list.push({
            key: `f${d.id}`,
            kind: "frontal",
            date: d.date,
            time: d.startTime,
            title: `יום פרונטלי · ${d.title}`,
            where: d.address,
            href: `/teacher/frontal-days/${d.id}`,
            note: left > 0 ? `נשארו ${left} משימות בצ'קליסט` : undefined,
          });
        } else if (d.reportStatus === "none" || d.reportStatus === "returned") {
          todo.push({ key: `fr${d.id}`, text: `למלא דוח סיום ליום הפרונטלי "${d.title}" (${fmtDate(d.date)})`, href: `/teacher/frontal-days/${d.id}` });
        }
      }
      for (const r of group?.awaitingReport ?? []) {
        todo.push({ key: `gr${r.id}`, text: `למלא דוח לשיעור הקבוצתי ${r.typeLabel} (${fmtDate(r.date)})`, href: `/teacher/group-lessons/${r.id}/report` });
      }
      for (const req of group?.requirement ?? []) {
        if (!req.met) todo.push({ key: `req${req.month}`, text: `עוד לא נרשמת לשיעור קבוצתי ב${monthName(req.month)}`, href: `/teacher/group-lessons?month=${req.month}` });
      }
      const openGroup = [...(group?.lessons ?? []), ...(groupNext?.lessons ?? [])].filter(
        (l) => !l.mine && !l.started && l.status === "open" && l.placesLeft > 0
      ).length;
      const openFrontal = days.filter((d) => !d.mine && !d.past && d.status === "open" && d.placesLeft > 0).length;
      setOpen({ group: openGroup, frontal: openFrontal });
      list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      setItems(list);
      setTodos(todo);
    })();
  }, []);

  if (items === null) return null;
  if (items.length === 0 && todos.length === 0 && open.group === 0 && open.frontal === 0) return null;

  return (
    <section aria-labelledby="assign-h" className="space-y-3">
      <h2 id="assign-h" className="text-lg font-semibold text-[var(--color-text)]">שיעורים קבוצתיים וימים פרונטליים</h2>

      {todos.length > 0 && (
        <ul className="space-y-2 rounded-[var(--radius-card)] border border-amber-200 bg-amber-50 p-4">
          {todos.map((t) => (
            <li key={t.key} className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900">
              <span className="min-w-0">{t.text}</span>
              <Link href={t.href} className="shrink-0 font-medium underline hover:no-underline">
                לטיפול
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(open.group > 0 || open.frontal > 0) && (
        <div className="flex flex-wrap gap-2">
          {open.group > 0 && (
            <Link
              href="/teacher/group-lessons"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-[var(--radius-input)] border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-900 hover:bg-sky-100"
            >
              <Users className="h-4 w-4" aria-hidden />
              {open.group === 1 ? "שיעור קבוצתי אחד פתוח להרשמה" : `${open.group} שיעורים קבוצתיים פתוחים להרשמה`}
            </Link>
          )}
          {open.frontal > 0 && (
            <Link
              href="/teacher/frontal-days"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-[var(--radius-input)] border border-violet-200 bg-violet-50 px-4 text-sm font-medium text-violet-900 hover:bg-violet-100"
            >
              <School className="h-4 w-4" aria-hidden />
              {open.frontal === 1 ? "יום פרונטלי אחד פתוח להרשמה" : `${open.frontal} ימים פרונטליים פתוחים להרשמה`}
            </Link>
          )}
        </div>
      )}

      {items.length > 0 ? (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
          {items.map((it) => (
            <li key={it.key}>
              <Link href={it.href} className="flex items-start gap-3 p-4 hover:bg-[var(--color-bg-muted)]">
                {it.kind === "group" ? (
                  <Users className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden />
                ) : (
                  <School className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[var(--color-text)]">{it.title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-[var(--color-text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" aria-hidden />
                      {fmtDate(it.date)} · {it.time}
                    </span>
                    {it.where && <span>{it.where}</span>}
                  </span>
                  {it.note && <span className="mt-1 block text-sm text-amber-800">{it.note}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--color-text-muted)]">עוד לא נרשמת לשיעור קבוצתי או ליום פרונטלי.</p>
      )}
    </section>
  );
}
