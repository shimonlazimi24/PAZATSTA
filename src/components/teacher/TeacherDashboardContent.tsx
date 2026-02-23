"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { TeacherHomeLessons } from "@/components/teacher/TeacherHomeLessons";
import { PendingApprovalsBlock } from "@/components/teacher/PendingApprovalsBlock";

export function TeacherDashboardContent() {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-2" dir="rtl">
      <header className="text-center sm:text-right pb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text)] tracking-tight">
          דף הבית — השיעורים שלי
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)] text-base max-w-xl">
          השיעורים הקרובים והשיעורים שעברו. לשיעורים שעברו — לחצו &quot;מלא דוח שיעור&quot; כדי למלא סיכום ולשלוח לתלמיד.
        </p>
      </header>

      <PendingApprovalsBlock />

      <section id="teacher-lessons">
        <TeacherHomeLessons />
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]">
        <Link
          href="/teacher/availability"
          className="flex items-center justify-center gap-3 w-full rounded-[var(--radius-input)] bg-[var(--color-primary)] px-5 py-3.5 text-base font-medium text-white hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <CalendarClock className="w-5 h-5 shrink-0" aria-hidden />
          הגדרת זמינות (תאריך ושעה)
        </Link>
      </section>
    </div>
  );
}
