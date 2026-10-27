import { AdminFrontalDayDetail } from "@/components/frontal-days/AdminFrontalDayDetail";

export default function AdminFrontalDayPage({ params }: { params: { id: string } }) {
  return (
    <div className="max-w-4xl">
      <AdminFrontalDayDetail id={params.id} />
    </div>
  );
}
