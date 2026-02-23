import { redirect } from "next/navigation";
import { getUserFromSession } from "@/lib/auth";
import { redirectByRole } from "@/lib/authRedirect";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromSession();
  if (!user) redirect("/login");
  if (user.role !== "student") redirectByRole(user.role);
  return <>{children}</>;
}
