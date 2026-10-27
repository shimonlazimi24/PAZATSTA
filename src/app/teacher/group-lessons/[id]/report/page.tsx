"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherGroupLessonReport } from "@/components/group-lessons/TeacherGroupLessonReport";

export default function TeacherGroupLessonReportPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell title="דוח שיעור קבוצתי">
      <TeacherGroupLessonReport id={id} />
    </AppShell>
  );
}
