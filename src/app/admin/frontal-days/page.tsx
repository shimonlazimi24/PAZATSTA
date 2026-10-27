import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminFrontalDaysList } from "@/components/frontal-days/AdminFrontalDaysList";

export default function AdminFrontalDaysPage() {
  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        title="ימים פרונטליים"
        description="כל יום הוא תיקייה: הפרטים, המדריכים, ההודעות, רשימת ההכנות ודוח הסיום."
        actions={
          <>
            <Link href="/admin/frontal-days/settings" className="inline-flex min-h-[40px] items-center rounded-[var(--radius-input)] border border-[var(--color-border)] bg-white px-4 text-sm font-medium hover:bg-[var(--color-bg-muted)]">
              הודעות ודוח ברירת מחדל
            </Link>
            <Link href="/admin/frontal-days/new" className="inline-flex min-h-[40px] items-center rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:opacity-90">
              יום חדש
            </Link>
          </>
        }
      />
      <AdminFrontalDaysList />
    </div>
  );
}
