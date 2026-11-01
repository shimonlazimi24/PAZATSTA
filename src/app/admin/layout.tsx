import { Suspense } from "react";
import { requireArea } from "@/lib/area-guard";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireArea("admin");

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">טוען…</div>}>
      <AdminShell email={user.email}>{children}</AdminShell>
    </Suspense>
  );
}
