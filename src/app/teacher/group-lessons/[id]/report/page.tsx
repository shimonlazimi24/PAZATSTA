"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TeacherGroupLessonReport } from "@/components/group-lessons/TeacherGroupLessonReport";

export default function TeacherGroupLessonReportPage({ params }: { params: { id: string } }) {
  return (
    <AppShell title="דוח שיעור קבוצתי">
      <TeacherGroupLessonReport id={params.id} />
    </AppShell>
  );
}
