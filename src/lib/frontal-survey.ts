/**
 * The students' feedback survey of a frontal day. Students open it from a QR
 * code without logging in; the admin sees how many answered out of the class
 * and a summary of the answers.
 */

import { addDaysYYYYMMDD } from "@/lib/dates";
import type { ReportAnswer } from "@/lib/frontal-days";

/** Students can answer from the day before (a teacher testing the QR) until two weeks after. */
export const SURVEY_OPEN_DAYS_AFTER = 14;

export function surveyOpen(p: { dateStr: string; todayStr: string; status: string }): boolean {
  if (p.status !== "open") return false;
  return p.todayStr >= addDaysYYYYMMDD(p.dateStr, -1) && p.todayStr <= addDaysYYYYMMDD(p.dateStr, SURVEY_OPEN_DAYS_AFTER);
}

export function surveyPath(dayId: string): string {
  return `/survey/${dayId}`;
}

/** "23 מתוך 30 ענו" when the class size is known, otherwise "23 ענו". */
export function surveyRatio(count: number, classSize: number | null | undefined): string {
  const answered = count === 1 ? "תלמיד אחד ענה" : `${count} ענו`;
  if (!classSize) return count === 0 ? "עוד אף אחד לא ענה" : answered;
  const pct = Math.round((count / classSize) * 100);
  return `${count} מתוך ${classSize} ענו (${pct}%)`;
}

type Question = { label: string; kind: string; options?: string[] };

export type QuestionSummary =
  | { label: string; kind: "choice"; answered: number; counts: { option: string; count: number }[] }
  | { label: string; kind: "number"; answered: number; average: number | null }
  | { label: string; kind: "text"; answered: number; texts: string[] };

/**
 * Sums up the answers per question, in the order of the current questions.
 * Answers are matched by label (labels are copied into each response), so a
 * question removed later still shows, after the current ones.
 */
export function summarizeSurvey(questions: Question[], responses: ReportAnswer[][]): QuestionSummary[] {
  const byLabel = new Map<string, string[]>();
  for (const r of responses) {
    for (const a of r) {
      if (!a.value?.trim()) continue;
      const list = byLabel.get(a.label) ?? [];
      list.push(a.value.trim());
      byLabel.set(a.label, list);
    }
  }
  const known = new Set(questions.map((q) => q.label));
  const all: Question[] = [
    ...questions,
    ...Array.from(byLabel.keys())
      .filter((l) => !known.has(l))
      .map((label) => ({ label, kind: "long" })),
  ];
  return all.map((q) => {
    const values = byLabel.get(q.label) ?? [];
    if (q.kind === "choice" || q.kind === "multi") {
      const picked = q.kind === "multi" ? values.flatMap((v) => v.split(", ")) : values;
      const options = [...(q.options ?? [])];
      for (const v of picked) if (!options.includes(v)) options.push(v);
      return {
        label: q.label,
        kind: "choice",
        answered: values.length,
        counts: options.map((option) => ({ option, count: picked.filter((v) => v === option).length })),
      };
    }
    if (q.kind === "number") {
      const nums = values.map(Number).filter((n) => Number.isFinite(n));
      return {
        label: q.label,
        kind: "number",
        answered: nums.length,
        average: nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null,
      };
    }
    return { label: q.label, kind: "text", answered: values.length, texts: values };
  });
}
