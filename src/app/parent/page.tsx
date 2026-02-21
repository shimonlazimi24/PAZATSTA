import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { MyLessonsList } from "@/components/MyLessonsList";
import { Button } from "@/components/design/Button";

export default async function ParentPage() {
  const user = await getUserFromSession();
  if (!user) redirect("/login");
  if (user.role !== "parent") redirect(`/${user.role}`);

  return (
    <DashboardLayout title="הורה" email={user.email}>
      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-1">קביעת שיעור לילד/ה</h2>
          <p className="text-sm text-muted-foreground mb-4">
            כל קביעת שיעור עוברת באותו תהליך: מקצוע → רמה → מורה → תאריך ושעה → פרטים → אישור.
          </p>
          <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <Link href="/book">
              <Button showArrow>קבע שיעור (תהליך מסודר)</Button>
            </Link>
            <p className="mt-3 text-sm text-gray-500">
              בהזנת הפרטים השתמשו באימייל של הילד/ה כדי שיקבל/תקבל את האישור והסיכום.
            </p>
          </div>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-1">השיעורים (הילדים שלכם)</h2>
          <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <MyLessonsList
              apiPath="/api/parent/lessons"
              emptyMessage="אין עדיין שיעורים. קבעו שיעור למעלה (השתמשו באימייל של התלמיד/ה)."
              showStudent
            />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
