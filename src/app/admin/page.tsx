import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/AdminShell";
import { DefineTeacherForm } from "@/components/admin/DefineTeacherForm";
import { SendSummaryButton } from "@/components/admin/SendSummaryButton";
import { PendingLessonsBlock } from "@/components/admin/PendingLessonsBlock";
import { AdminWeeklyBoard } from "@/components/admin/AdminWeeklyBoard";

export default async function AdminPage() {
  const user = await getUserFromSession();
  if (!user) redirect("/login?next=/admin");
  if (!canAccessAdmin(user)) redirect("/login?next=/admin");

  return (
    <AdminShell email={user.email}>
      <div className="space-y-8">
        <PendingLessonsBlock />
        <AdminWeeklyBoard />
        <section>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-3 text-right">
            הגדרת מורה
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-3 text-right">
            הזינו אימייל כדי ליצור משתמש מורה או לעדכן תפקיד קיים למורה.
          </p>
          <DefineTeacherForm />
        </section>
        <section>
          <h2 className="text-xl font-bold text-[var(--color-text)] mb-3 text-right">
            סיכום שיעורים
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mb-3 text-right">
            שליחת סיכום כל השיעורים שהושלמו (7 ימים אחרונים) לאימייל שלך.
          </p>
          <SendSummaryButton />
        </section>
      </div>
    </AdminShell>
  );
}
