"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiJson } from "@/lib/api";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { EMPTY_DAY, FrontalDayForm } from "@/components/frontal-days/FrontalDayForm";

export default function NewFrontalDayPage() {
  const router = useRouter();
  return (
    <div className="max-w-2xl">
      <Link href="/admin/frontal-days" className="mb-3 inline-block text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
        חזרה לימים הפרונטליים
      </Link>
      <AdminPageHeader title="יום פרונטלי חדש" description="ההודעה, התזכורת ורשימת ההכנות נלקחות מברירת המחדל, ואפשר לשנות אותן ביום עצמו אחרי היצירה." />
      <FrontalDayForm
        initial={EMPTY_DAY}
        submitLabel="פתיחת היום"
        onSubmit={async (v) => {
          const r = await apiJson<{ id: string }>("/api/admin/frontal-days", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(v),
          });
          if (!r.ok) return r.error;
          router.push(`/admin/frontal-days/${r.data.id}`);
          return null;
        }}
      />
    </div>
  );
}
