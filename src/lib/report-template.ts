import { prisma } from "@/lib/db";
import { tipAppliesToLesson } from "@/lib/topic-key";

/**
 * The lesson-summary template: which fields the teacher fills in, and which tips
 * are offered for a given lesson type.
 *
 * The set of fields is fixed — it mirrors the LessonSummary columns — so this
 * module owns the allowlist and the defaults. The database only supplies wording.
 */

/** Separator between tip bodies. Must not change: it is baked into every snapshot. */
export const TIP_SEPARATOR = "\n\n---\n\n";

/** Longest a single tip body may be, matching the report fields' own cap. */
export const MAX_TIP_LENGTH = 5000;
/** Ceiling on a resolved snapshot, so admin text cannot make a PDF unrenderable. */
export const MAX_SNAPSHOT_LENGTH = 50_000;
/** No teacher picks more than a handful; this only bounds a hostile payload. */
export const MAX_TIP_SELECTION = 50;

export type ReportFieldKey =
  | "summaryText"
  | "pointsToKeep"
  | "pointsToImprove"
  | "tips"
  | "recommendations"
  | "homeworkText";

export type ReportField = {
  key: ReportFieldKey;
  label: string;
  helpText: string;
  placeholder: string;
  isRequired: boolean;
};

/**
 * The fields, in the order the form renders them, with the wording that shipped
 * before the table existed.
 *
 * These are not merely fallbacks — they are the allowlist. A row in
 * ReportFieldConfig that is missing, or a key that is not here, can never change
 * which fields the form shows, so a partial or hand-edited table cannot take the
 * report page down.
 */
const FIELD_DEFAULTS: readonly ReportField[] = [
  { key: "summaryText", label: "סיכום כללי", helpText: "", placeholder: "סיכום כללי של השיעור", isRequired: true },
  { key: "pointsToKeep", label: "נקודות לשימור", helpText: "", placeholder: "מה עבד טוב, לשמור עליו", isRequired: true },
  { key: "pointsToImprove", label: "נקודות לשיפור", helpText: "", placeholder: "מה לשפר", isRequired: true },
  { key: "tips", label: "טיפים", helpText: "", placeholder: "", isRequired: false },
  { key: "recommendations", label: "המלצות להמשך", helpText: "", placeholder: "המלצות לשיעורים הבאים", isRequired: true },
  { key: "homeworkText", label: "משימות לתרגול", helpText: "", placeholder: "תרגול והכנה לשיעור הבא", isRequired: false },
];

export const REPORT_FIELD_KEYS: readonly ReportFieldKey[] = FIELD_DEFAULTS.map((f) => f.key);

export function isReportFieldKey(value: string): value is ReportFieldKey {
  return (REPORT_FIELD_KEYS as readonly string[]).includes(value);
}

/** The six fields with any admin wording overlaid on the defaults. */
export async function getReportFields(): Promise<ReportField[]> {
  let rows: { key: string; label: string; helpText: string; placeholder: string; isRequired: boolean }[] = [];
  try {
    rows = await prisma.reportFieldConfig.findMany();
  } catch (e) {
    // A missing table (deploy ahead of migration) must not break the form.
    console.error("[report-template] Could not read field config, using defaults:", e);
  }

  return mergeFieldConfig(rows);
}

/**
 * Overlay stored wording onto the defaults.
 *
 * Exported for its own sake: this is the rule that keeps a partial or
 * hand-edited config table from changing which fields exist.
 */
export function mergeFieldConfig(
  rows: { key: string; label: string; helpText: string; placeholder: string; isRequired: boolean }[]
): ReportField[] {
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return FIELD_DEFAULTS.map((def) => {
    const row = byKey.get(def.key);
    if (!row) return { ...def };
    return {
      key: def.key,
      // An admin who blanks a label gets the default back rather than a nameless field.
      label: row.label.trim() || def.label,
      helpText: row.helpText ?? "",
      placeholder: row.placeholder ?? "",
      isRequired: row.isRequired,
    };
  });
}

export type OfferedTip = {
  slug: string;
  label: string;
  groupLabel: string;
};

/**
 * Tips offered for a lesson: those scoped to its type, plus the general ones.
 *
 * The table holds a couple of dozen rows, so the topic filter runs here rather
 * than in SQL — `Tip.topics` stores normalized keys and the comparison is a
 * plain lookup, but keeping it in one place means the matching rule cannot drift
 * between the picker and the snapshot.
 */
export async function getTipsForLesson(lessonTopic: string | null): Promise<OfferedTip[]> {
  const tips = await prisma.tip.findMany({
    where: { isArchived: false },
    orderBy: { sortOrder: "asc" },
    select: { slug: true, label: true, groupLabel: true, topics: true },
  });
  return tips
    .filter((t) => tipAppliesToLesson(t.topics, lessonTopic))
    .map(({ slug, label, groupLabel }) => ({ slug, label, groupLabel }));
}

/**
 * Resolve the selected tips into the text that goes into the report, and freeze it.
 *
 * Always computed on the server from the Tip table — never taken from the client,
 * which would let a teacher put arbitrary text into a parent-facing PDF.
 * Unknown or archived slugs are dropped silently: a teacher submitting from a
 * stale tab must not be blocked because an admin archived a tip meanwhile.
 */
export async function buildTipsSnapshot(slugs: string[], custom: string): Promise<string> {
  const wanted = Array.from(new Set(slugs.map((s) => s.trim()).filter(Boolean))).slice(
    0,
    MAX_TIP_SELECTION
  );

  let resolved: string[] = [];
  if (wanted.length > 0) {
    const rows = await prisma.tip.findMany({
      where: { slug: { in: wanted } },
      orderBy: { sortOrder: "asc" },
      select: { text: true },
    });
    resolved = rows.map((r) => r.text);
  }

  return composeSnapshot(resolved, custom);
}

/** Join resolved tip bodies and the teacher's free text into one frozen string. */
export function composeSnapshot(tipTexts: string[], custom: string): string {
  const parts = tipTexts.map((t) => t.trim()).filter(Boolean);
  const trimmedCustom = custom.trim();
  if (trimmedCustom) parts.push(trimmedCustom);
  return parts.join(TIP_SEPARATOR).slice(0, MAX_SNAPSHOT_LENGTH);
}

/** The slugs stored on a summary, in the order they were written. */
export function parseStoredSlugs(tips: string): string[] {
  return tips
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The tip text to render for a summary.
 *
 * Three levels, in order: the frozen snapshot; failing that, resolving the stored
 * slugs against the current library; failing that, the raw string, which is how
 * free text was stored before slugs existed.
 *
 * Only summaries written before the snapshot column existed reach the second and
 * third levels, and those are the rows whose rendering can still shift when a tip
 * is edited. Everything written since is frozen.
 */
export async function resolveTipsText(summary: {
  tips: string;
  tipsSnapshot?: string | null;
}): Promise<string> {
  const snapshot = summary.tipsSnapshot?.trim();
  if (snapshot) return snapshot;

  const slugs = parseStoredSlugs(summary.tips);
  if (slugs.length === 0) return summary.tips.trim();

  const rows = await prisma.tip.findMany({
    where: { slug: { in: slugs } },
    orderBy: { sortOrder: "asc" },
    select: { text: true },
  });
  if (rows.length === 0) return summary.tips.trim();
  return rows.map((r) => r.text).join(TIP_SEPARATOR);
}
