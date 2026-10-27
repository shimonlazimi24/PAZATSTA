import { AdminTeacherEdit } from "@/components/admin/AdminTeacherEdit";

export default function AdminTeacherEditPage({ params }: { params: { id: string } }) {
  return <AdminTeacherEdit teacherId={params.id} />;
}
