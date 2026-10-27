import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminWeeklyCalendar } from "@/components/admin/AdminWeeklyCalendar";

export default function AdminCalendarPage() {
  return (
    <>
      <AdminPageHeader title="לוח שבועי" description="כל השיעורים של השבוע: ממתינים, מתוזמנים והושלמו." />
      <AdminWeeklyCalendar />
    </>
  );
}
