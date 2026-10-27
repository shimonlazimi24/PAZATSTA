"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TeacherFrontalDay } from "@/components/frontal-days/TeacherFrontalDay";

export default function TeacherFrontalDayPage({ params }: { params: { id: string } }) {
  return (
    <AppShell title="יום פרונטלי">
      <TeacherFrontalDay id={params.id} />
    </AppShell>
  );
}
