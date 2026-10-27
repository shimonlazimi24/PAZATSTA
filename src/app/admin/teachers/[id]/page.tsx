import { AdminTeacherEdit } from "@/components/admin/AdminTeacherEdit";

export default async function AdminTeacherEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminTeacherEdit teacherId={id} />;
}
