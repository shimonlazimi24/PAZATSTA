import { redirect } from "next/navigation";
import { AdminHome } from "@/components/admin/AdminHome";
import { legacyAdminPath } from "@/components/admin/admin-nav";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; id?: string }>;
}) {
  const { section, id } = await searchParams;
  // Old links used /admin?section=…; send them to the screen's own URL.
  const legacy = legacyAdminPath(section ?? null, id ?? null);
  if (legacy && legacy !== "/admin") redirect(legacy);
  return <AdminHome />;
}
