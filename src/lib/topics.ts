/**
 * Topic groups for סוג מיון. "חוזר" (retake) options share the same התמחות
 * as their category - teachers with any specialty in the group can teach them.
 */
export const TOPIC_GROUPS = {
  tzav: [
    "צו ראשון - מבחן דפר",
    "צו ראשון - ראיון אישי",
    "מבחן דפ״ר חוזר",
  ],
  yom100: [
    "יום המא״ה - תחנות קבוצתיות",
    "יום המא״ה - מבחנים פסיכוטכניים",
    "יום המא״ה חוזר (תחנות קבוצתיות/מבחנים פסיכוטכניים)",
  ],
} as const;

/** Get specialties to match for a topic (for teachers API filter) */
export function getTopicsToMatch(selectedTopic: string): string[] {
  if (selectedTopic === "מבחן דפ״ר חוזר") return ["צו ראשון - מבחן דפר"];
  if (selectedTopic === "יום המא״ה חוזר (תחנות קבוצתיות/מבחנים פסיכוטכניים)") return [...TOPIC_GROUPS.yom100];
  return [selectedTopic];
}

/** Check if teacher has a matching specialty for the selected topic */
export function teacherMatchesTopic(specialties: string[], selectedTopic: string): boolean {
  if (specialties.includes(selectedTopic)) return true;
  if (selectedTopic === "מבחן דפ״ר חוזר") {
    return specialties.includes("צו ראשון - מבחן דפר");
  }
  if (selectedTopic === "יום המא״ה חוזר (תחנות קבוצתיות/מבחנים פסיכוטכניים)") {
    return specialties.some((s) => (TOPIC_GROUPS.yom100 as readonly string[]).includes(s));
  }
  return false;
}
