import { redirect } from "next/navigation";

/**
 * Redirect to the default landing page for the given role.
 * Use in layouts to keep auth redirect logic DRY.
 */
export function redirectByRole(userRole: string): never {
  if (userRole === "student") redirect("/student");
  if (userRole === "teacher") redirect("/teacher/dashboard");
  if (userRole === "admin") redirect("/admin");
  redirect("/login");
}
