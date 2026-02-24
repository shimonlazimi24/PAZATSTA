import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { redirectByRole } from "@/lib/authRedirect";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getUserFromSession();
  } catch (e) {
    console.error("[teacher/layout] getUserFromSession failed:", e);
    redirect("/login");
  }
  if (!user) redirect("/login");
  if (user.role !== "teacher") redirectByRole(user.role);
  return <>{children}</>;
}
