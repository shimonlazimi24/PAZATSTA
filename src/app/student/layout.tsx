import { requireArea } from "@/lib/area-guard";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireArea("student");
  return <>{children}</>;
}
