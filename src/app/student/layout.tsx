import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromSession();
  if (!user) redirect("/login");
  if (user.role !== "student") {
    if (user.role === "teacher") redirect("/teacher/availability");
    if (user.role === "admin") redirect("/admin");
    redirect("/login");
  }
  return <>{children}</>;
}
