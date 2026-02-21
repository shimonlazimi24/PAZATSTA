import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { StudentDashboardContent } from "@/components/student/StudentDashboardContent";

export default async function StudentPage() {
  const user = await getUserFromSession();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect(`/${user.role}`);

  return (
    <AppShell title="השיעורים שלי">
      <StudentDashboardContent />
    </AppShell>
  );
}
