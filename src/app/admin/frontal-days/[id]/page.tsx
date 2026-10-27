import { AdminFrontalDayDetail } from "@/components/frontal-days/AdminFrontalDayDetail";

export default async function AdminFrontalDayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="max-w-4xl">
      <AdminFrontalDayDetail id={id} />
    </div>
  );
}
