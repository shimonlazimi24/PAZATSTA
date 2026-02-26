"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PendingLessonsBlock } from "./PendingLessonsBlock";
import { AdminWeeklyCalendar } from "./AdminWeeklyCalendar";
import { DefineTeacherForm } from "./DefineTeacherForm";
import { SendHoursSummaryButton } from "./SendHoursSummaryButton";

function AdminContentInner() {
  const searchParams = useSearchParams();
  const section = searchParams.get("section") || "weekly";

  if (section === "pending") {
    return (
      <div className="max-w-2xl">
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-4 text-right">
          שיעורים בהמתנה לאישור
        </h2>
        <PendingLessonsBlock />
      </div>
    );
  }

  if (section === "teacher") {
    return (
      <div className="max-w-xl">
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-3 text-right">
          הגדרת מורה
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4 text-right">
          הזינו אימייל כדי ליצור משתמש מורה או לעדכן תפקיד קיים למורה.
        </p>
        <DefineTeacherForm />
      </div>
    );
  }

  if (section === "summary") {
    return (
      <div className="max-w-xl">
        <h2 className="text-xl font-bold text-[var(--color-text)] mb-3 text-right">
          סיכום שעות לתשלום
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-4 text-right">
          שליחת סיכום שעות לכל מורה (שיעורים שהושלמו, 7 ימים אחרונים) לאימייל שלך — לצורך תשלום.
        </p>
        <SendHoursSummaryButton />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-[var(--color-text)] mb-4 text-right">
        לוח שבועי
      </h2>
      <AdminWeeklyCalendar />
    </div>
  );
}

export function AdminContent() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--color-text-muted)]">טוען…</p>}>
      <AdminContentInner />
    </Suspense>
  );
}
