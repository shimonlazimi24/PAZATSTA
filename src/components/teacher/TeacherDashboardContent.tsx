"use client";

import { useSearchParams } from "next/navigation";
import { TeacherHomeLessons } from "@/components/teacher/TeacherHomeLessons";
import { PendingApprovalsBlock } from "@/components/teacher/PendingApprovalsBlock";

export function TeacherDashboardContent() {
  const searchParams = useSearchParams();
  const reportError = searchParams.get("error") === "report_blocked";

  return (
    <div className="max-w-3xl space-y-10" dir="rtl">
      {reportError && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          לא ניתן למלא דוח – השיעור לא אושר (בוטל / ממתין לאישור)
        </div>
      )}
      <header>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">השיעורים שלי</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          בקשות לאישור, השיעורים הקרובים, ושיעורים שעברו ומחכים לדוח.
        </p>
      </header>

      <PendingApprovalsBlock />

      <section id="teacher-lessons">
        <TeacherHomeLessons />
      </section>
    </div>
  );
}
