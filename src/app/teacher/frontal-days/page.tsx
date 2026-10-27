"use client";

import { AppShell } from "@/components/layout/AppShell";
import { TeacherFrontalDays } from "@/components/frontal-days/TeacherFrontalDays";

export default function TeacherFrontalDaysPage() {
  return (
    <AppShell title="ימים פרונטליים">
      <TeacherFrontalDays />
    </AppShell>
  );
}
