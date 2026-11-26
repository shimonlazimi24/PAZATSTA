/** The booking categories a topic can belong to (ids match the booking page). */
export const TOPIC_CATEGORIES = [
  { id: "tzav", title: "הכנה לצו ראשון" },
  { id: "yom100", title: "הכנה ליום המאה" },
  { id: "modiin", title: "הכנה למסלולי המודיעין" },
  { id: "flight", title: "הכנה לקורס טיס" },
  { id: "other", title: "אחר" },
] as const;

export type TopicCategoryId = (typeof TOPIC_CATEGORIES)[number]["id"];

export function isTopicCategory(v: unknown): v is TopicCategoryId {
  return TOPIC_CATEGORIES.some((c) => c.id === v);
}

/** A topic the admin added, as the booking form and the specialty pickers get it. */
export type AddedTopic = { id: string; category: string; label: string };
/** A booking card the admin added; its topics carry its id as their category. */
export type AddedCategory = { id: string; title: string };
