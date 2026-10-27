"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TeacherGroupLessons } from "@/components/group-lessons/TeacherGroupLessons";

export default function TeacherGroupLessonsPage() {
  return (
    <AppShell title="שיעורים קבוצתיים">
      <TeacherGroupLessons />
    </AppShell>
  );
}
