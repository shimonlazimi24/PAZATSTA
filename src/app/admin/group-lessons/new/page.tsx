"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GroupLessonForm, saveGroupLesson } from "@/components/group-lessons/GroupLessonForm";

function NewGroupLesson() {
  const router = useRouter();
  const month = useSearchParams().get("month");
  const defaultDate = month ? `${month}-01` : "";
  return (
    <GroupLessonForm
      initial={{ typeId: "", date: defaultDate, startTime: "09:00", endTime: "12:00", location: "", details: "", teachersNeeded: 1 }}
      submitLabel="יצירת השיעור"
      onSubmit={async (v) => {
        const r = await saveGroupLesson("/api/admin/group-lessons", "POST", v);
        if (!r.ok) return r.error;
        router.push(`/admin/group-lessons?month=${v.date.slice(0, 7)}`);
        return null;
      }}
    />
  );
}

export default function NewGroupLessonPage() {
  return (
    <div className="max-w-2xl">
      <Link href="/admin/group-lessons" className="mb-3 inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        חזרה לשיעורים הקבוצתיים
      </Link>
      <AdminPageHeader title="שיעור קבוצתי חדש" description="השיעור יופיע למורים להרשמה. ההודעה על פתיחת ההרשמה נשלחת בתחילת החודש שלפני." />
      <Suspense>
        <NewGroupLesson />
      </Suspense>
    </div>
  );
}
