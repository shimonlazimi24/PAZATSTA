import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { FrontalSettings } from "@/components/frontal-days/FrontalSettings";

export default function FrontalSettingsPage() {
  return (
    <div className="max-w-5xl">
      <Link href="/admin/frontal-days" className="mb-3 inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        חזרה לימים הפרונטליים
      </Link>
      <AdminPageHeader title="הודעות ודוח ברירת מחדל" />
      <FrontalSettings />
    </div>
  );
}
