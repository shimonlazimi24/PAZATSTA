import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminRatings } from "@/components/ratings/AdminRatings";

export default function AdminRatingsPage() {
  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        title="דירוגים"
        description="התמונות והסרטונים שהמורים העלו, וכמה כל מורה העלה."
      />
      <AdminRatings />
    </div>
  );
}
