import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DefineTeacherForm } from "@/components/admin/DefineTeacherForm";

export default function AdminNewTeacherPage() {
  return (
    <div className="max-w-xl">
      <AdminPageHeader
        title="הוספת מדריך"
        description="הזינו אימייל כדי ליצור משתמש מדריך, או להפוך משתמש קיים למדריך."
      />
      <DefineTeacherForm />
    </div>
  );
}
