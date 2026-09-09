/**
 * Lesson types are raw Hebrew strings, and the same type is spelled differently
 * across the app's vocabularies — `src/data/topics.ts` has both
 * "צו ראשון - מבחן דפר" (no gershayim) and "צו ראשון - מבחן דפ\"ר" (ASCII quote),
 * while the booking page uses "מבחן דפ״ר חוזר" (U+05F4).
 *
 * Comparing those with `===` silently drops matches, which is why the old tip
 * catalogue matched with `["״']?` regexes instead. Normalising both sides once
 * replaces that, and the normalised form is what `Tip.topics` stores.
 */

/** Geresh, gershayim, straight and curly quotes, acute accent, backtick. */
const QUOTE_CHARS = /[׳״‘’“”"'´`]/g;
/** En/em dashes and friends, folded to a plain hyphen. */
const DASH_CHARS = /[‐-―−]/g;
/** Bidi control marks — real risk for Hebrew pasted out of Word. */
const BIDI_MARKS = /[‎‏‪-‮⁦-⁩]/g;

/** Workshop topics are generated per instance; they share one key. */
const WORKSHOP_TOPIC_PREFIX = /^\s*סדנה\s*·/;

/** The single key every workshop lesson matches, whatever its name and date. */
export const WORKSHOP_TOPIC_KEY = "סדנה";

/**
 * Reduce a lesson-type label to a form that survives punctuation drift.
 * Only punctuation and whitespace are normalised — two genuinely different
 * topics never collapse into each other.
 */
export function normalizeTopicKey(value: string): string {
  return value
    .normalize("NFKC")
    .replace(QUOTE_CHARS, "")
    .replace(DASH_CHARS, "-")
    .replace(BIDI_MARKS, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * The key to match tips against for a given lesson.
 *
 * `buildWorkshopTopicLabel` produces `סדנה · <name> · <date>`, which is unique
 * per workshop instance. Left as-is, no tip could ever be scoped to workshops,
 * because the key would change with every new one. They collapse to a single
 * key so the admin can scope tips to workshops as a category.
 */
export function topicKeyForLesson(topic: string | null | undefined): string {
  if (!topic) return "";
  if (WORKSHOP_TOPIC_PREFIX.test(topic)) return WORKSHOP_TOPIC_KEY;
  return normalizeTopicKey(topic);
}

/** True when two lesson-type labels name the same type despite spelling drift. */
export function topicsMatch(a: string, b: string): boolean {
  const keyA = normalizeTopicKey(a);
  return keyA.length > 0 && keyA === normalizeTopicKey(b);
}

/**
 * Whether a tip applies to a lesson, given the tip's stored topic keys.
 * A tip with no topics is general and is offered for every lesson.
 */
export function tipAppliesToLesson(tipTopicKeys: string[], lessonTopic: string | null): boolean {
  if (tipTopicKeys.length === 0) return true;
  const key = topicKeyForLesson(lessonTopic);
  if (!key) return false;
  return tipTopicKeys.includes(key);
}
