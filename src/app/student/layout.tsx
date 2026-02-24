import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { redirectByRole } from "@/lib/authRedirect";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getUserFromSession();
  } catch (e) {
    console.error("[student/layout] getUserFromSession failed:", e);
    redirect("/login");
  }
  if (!user) redirect("/login");
  if (user.role !== "student") redirectByRole(user.role);
  return <>{children}</>;
}
