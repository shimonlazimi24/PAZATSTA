import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { DefineTeacherForm } from "@/components/admin/DefineTeacherForm";

export default function AdminNewTeacherPage() {
  return (
    <div className="max-w-xl">
      <AdminPageHeader
        title="הוספת מורה"
        description="הזינו אימייל כדי ליצור משתמש מורה, או להפוך משתמש קיים למורה."
      />
      <DefineTeacherForm />
    </div>
  );
}
