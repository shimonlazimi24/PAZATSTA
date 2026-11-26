/** Answers to questions the admin added to the lesson summary (LessonSummary.extraAnswers). */
export type ExtraAnswer = { key: string; label: string; value: string };

/** Reads extraAnswers back safely: it is JSON in the database. */
export function readExtraAnswers(raw: unknown): ExtraAnswer[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (a): a is ExtraAnswer =>
        !!a && typeof a === "object" && typeof (a as ExtraAnswer).label === "string" && typeof (a as ExtraAnswer).value === "string"
    )
    .map((a) => ({ key: String(a.key ?? ""), label: a.label, value: a.value }));
}
