import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SendHoursSummaryButton } from "@/components/admin/SendHoursSummaryButton";

export default function AdminHoursPage() {
  return (
    <div className="max-w-xl">
      <AdminPageHeader
        title="סיכום שעות לתשלום"
        description="שליחת סיכום שעות לכל מדריך לאימייל שלך, לצורך תשלום. נספרים רק שיעורים שהושלמו בחודש הקודם; שיעור שסומן 'לא התקיים' לא נספר."
      />
      <SendHoursSummaryButton />
    </div>
  );
}
