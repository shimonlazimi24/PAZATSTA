import { redirect } from "next/navigation";
import { AdminHome } from "@/components/admin/AdminHome";
import { legacyAdminPath } from "@/components/admin/admin-nav";

export default function AdminPage({
  searchParams,
}: {
  searchParams: { section?: string; id?: string };
}) {
  // Old links used /admin?section=…; send them to the screen's own URL.
  const legacy = legacyAdminPath(searchParams.section ?? null, searchParams.id ?? null);
  if (legacy && legacy !== "/admin") redirect(legacy);
  return <AdminHome />;
}
