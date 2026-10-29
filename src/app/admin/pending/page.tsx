import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PendingLessonsBlock } from "@/components/admin/PendingLessonsBlock";

export default function AdminPendingPage() {
  return (
    <div className="max-w-2xl">
      <AdminPageHeader
        title="שיעורים בהמתנה לאישור"
        description="בקשות שהמורה עוד לא אישר. בקשה שלא אושרה תוך 24 שעות מתבטלת אוטומטית."
      />
      <PendingLessonsBlock />
    </div>
  );
}
