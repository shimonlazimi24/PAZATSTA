import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await getUserFromSession();
  } catch (e) {
    console.error("[admin/layout] getUserFromSession failed:", e);
    redirect("/login?next=/admin");
  }
  if (!user) redirect("/login?next=/admin");
  if (!canAccessAdmin(user)) redirect("/login?next=/admin");

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען…</div>}>
      <AdminShell email={user.email}>{children}</AdminShell>
    </Suspense>
  );
}
