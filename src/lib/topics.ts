/**
 * Topic groups for סוג מיון. "חוזר" (retake) options share the same התמחות
 * as their category - teachers with any specialty in the group can teach them.
 */
export const TOPIC_GROUPS = {
  tzav: [
    "צו ראשון - מבחן דפר",
    "צו ראשון - ראיון אישי",
    "צו ראשון חוזר",
  ],
  yom100: [
    "יום המא״ה - תחנות קבוצתיות",
    "יום המא״ה - מבחנים פסיכוטכניים",
    "יום המא״ה חוזר",
  ],
} as const;

/** Get specialties to match for a topic (for teachers API filter) */
export function getTopicsToMatch(selectedTopic: string): string[] {
  if (selectedTopic === "צו ראשון חוזר") return [...TOPIC_GROUPS.tzav];
  if (selectedTopic === "יום המא״ה חוזר") return [...TOPIC_GROUPS.yom100];
  return [selectedTopic];
}

/** Check if teacher has a matching specialty for the selected topic */
export function teacherMatchesTopic(specialties: string[], selectedTopic: string): boolean {
  if (specialties.includes(selectedTopic)) return true;
  if (selectedTopic === "צו ראשון חוזר") {
    return specialties.some((s) => (TOPIC_GROUPS.tzav as readonly string[]).includes(s));
  }
  if (selectedTopic === "יום המא״ה חוזר") {
    return specialties.some((s) => (TOPIC_GROUPS.yom100 as readonly string[]).includes(s));
  }
  return false;
}
