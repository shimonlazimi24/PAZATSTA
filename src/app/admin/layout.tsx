import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUserFromSession();
  if (!user) redirect("/login?next=/admin");
  if (!canAccessAdmin(user)) redirect("/login?next=/admin");

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען…</div>}>
      <AdminShell email={user.email}>{children}</AdminShell>
    </Suspense>
  );
}
