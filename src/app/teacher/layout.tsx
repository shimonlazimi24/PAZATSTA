import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromSession();
  if (!user) redirect("/login");
  if (user.role !== "teacher") {
    if (user.role === "student") redirect("/student");
    if (user.role === "admin") redirect("/admin");
    redirect("/login");
  }
  return <>{children}</>;
}
