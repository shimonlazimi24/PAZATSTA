import { AdminGroupLessonDetail } from "@/components/group-lessons/AdminGroupLessonDetail";

export default async function AdminGroupLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-3xl">
      <AdminGroupLessonDetail id={id} />
    </div>
  );
}
