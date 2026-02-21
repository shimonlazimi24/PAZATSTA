import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { StudentDashboardContent } from "@/components/student/StudentDashboardContent";

export default async function StudentPage() {
  const user = await getUserFromSession();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect(`/${user.role}`);

  return <StudentDashboardContent />;
}
