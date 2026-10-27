import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { GroupLessonTypesManager } from "@/components/group-lessons/GroupLessonTypesManager";

export default function GroupLessonTypesPage() {
  return (
    <div className="max-w-3xl">
      <Link href="/admin/group-lessons" className="mb-3 inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        חזרה לשיעורים הקבוצתיים
      </Link>
      <AdminPageHeader title="סוגי שיעורים קבוצתיים" description="הקטגוריות והסוגים שמהם בוחרים כשיוצרים שיעור, ושהמדריכים מסמנים בדוח." />
      <GroupLessonTypesManager />
    </div>
  );
}
