import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BookingTopicsBlock } from "@/components/admin/BookingTopicsBlock";

export default function AdminTopicsPage() {
  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="נושאי הכנה"
        description="נושאים שתלמידים בוחרים בקביעת שיעור, ושמסמנים למורים כהתמחות. כאן מוסיפים נושאים חדשים."
      />
      <BookingTopicsBlock />
    </div>
  );
}
