import { Suspense } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminGroupLessonsMonth } from "@/components/group-lessons/AdminGroupLessonsMonth";
import { monthKeyOf } from "@/lib/group-lessons";
import { todayIsraelYYYYMMDD } from "@/lib/dates";

export default function AdminGroupLessonsPage() {
  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="שיעורים קבוצתיים"
        description="כל מדריך מעביר לפחות שיעור קבוצתי אחד בחודש. ההרשמה לחודש נפתחת בתחילת החודש שלפניו."
      />
      <Suspense fallback={<p className="text-sm text-[var(--color-text-muted)]">טוען…</p>}>
        <AdminGroupLessonsMonth initialMonth={monthKeyOf(todayIsraelYYYYMMDD())} />
      </Suspense>
    </div>
  );
}
