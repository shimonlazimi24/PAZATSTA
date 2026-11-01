import { requireArea } from "@/lib/area-guard";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  await requireArea("teacher");
  return <>{children}</>;
}
