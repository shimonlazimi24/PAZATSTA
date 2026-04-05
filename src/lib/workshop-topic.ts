/** Stable unique label for סוג מיון + TeacherProfile.specialties */
export function buildWorkshopTopicLabel(workshopName: string, dateYYYYMMDD: string): string {
  return `סדנה · ${workshopName.trim()} · ${dateYYYYMMDD}`;
}
