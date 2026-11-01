import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminWeeklyCalendar } from "@/components/admin/AdminWeeklyCalendar";

export default function AdminCalendarPage() {
  return (
    <div className="max-w-3xl">
      <AdminPageHeader title="לוח שבועי" description="השיעורים הפרטיים, השיעורים הקבוצתיים והימים הפרונטליים של השבוע, לפי יום." />
      <AdminWeeklyCalendar />
    </div>
  );
}
