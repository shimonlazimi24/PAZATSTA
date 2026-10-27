import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TeachersListBlock } from "@/components/admin/TeachersListBlock";

export default function AdminTeachersPage() {
  return (
    <div className="max-w-2xl">
      <AdminPageHeader
        title="רשימת מדריכים"
        description="כל המדריכים הרשומים במערכת. לחצו על מדריך לעריכת פרטים וזמינות."
        actions={
          <Link
            href="/admin/teachers/new"
            className="inline-flex min-h-[40px] items-center rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:opacity-90"
          >
            הוספת מדריך
          </Link>
        }
      />
      <TeachersListBlock />
    </div>
  );
}
