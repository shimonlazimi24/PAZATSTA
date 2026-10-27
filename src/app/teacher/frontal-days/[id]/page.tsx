"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TeacherFrontalDay } from "@/components/frontal-days/TeacherFrontalDay";

export default function TeacherFrontalDayPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell title="יום פרונטלי">
      <TeacherFrontalDay id={id} />
    </AppShell>
  );
}
