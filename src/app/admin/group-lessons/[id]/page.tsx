import { AdminGroupLessonDetail } from "@/components/group-lessons/AdminGroupLessonDetail";

export default function AdminGroupLessonPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-3xl">
      <AdminGroupLessonDetail id={params.id} />
    </div>
  );
}
