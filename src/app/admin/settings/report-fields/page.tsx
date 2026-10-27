import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ReportFieldsBlock } from "@/components/admin/ReportFieldsBlock";

export default function AdminReportFieldsPage() {
  return (
    <div className="max-w-2xl">
      <AdminPageHeader title="שדות דוח הסיכום" description="הניסוח של שדות הדוח שהמדריכים ממלאים. דוחות שכבר נשלחו לא משתנים." />
      <ReportFieldsBlock />
    </div>
  );
}
