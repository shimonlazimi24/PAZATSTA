"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiJson } from "@/lib/api";

type Teacher = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
};

export function TeachersListBlock() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  function fetchTeachers() {
    setLoading(true);
    apiJson<Teacher[]>("/api/admin/teachers")
      .then((r) => {
        if (r.ok) setTeachers(r.data);
        else setTeachers([]);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchTeachers();
  }, []);

  if (loading) return <p className="text-sm text-[var(--color-text-muted)]">טוען…</p>;

  if (teachers.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-white px-5 py-8 text-center" dir="rtl">
        אין עדיין מדריכים במערכת.
        <Link href="/admin/teachers/new" className="mt-2 block text-sm font-medium text-[var(--color-primary)] hover:underline">
          הוספת המדריך הראשון
        </Link>
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-border)] bg-white" dir="rtl">
      <table className="w-full text-right text-sm">
        <thead className="bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">
          <tr>
            <th className="px-4 py-2.5 font-medium">שם</th>
            <th className="hidden px-4 py-2.5 font-medium sm:table-cell">אימייל</th>
            <th className="hidden px-4 py-2.5 font-medium sm:table-cell">טלפון</th>
          </tr>
        </thead>
        <tbody>
          {teachers.map((t) => (
            <tr key={t.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-bg-muted)]/50">
              <td className="px-4 py-3">
                <Link href={`/admin/teachers/${t.id}`} className="font-medium text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline">
                  {t.name || t.email}
                </Link>
                <span className="block text-xs text-[var(--color-text-muted)] sm:hidden">{t.email}</span>
              </td>
              <td className="hidden px-4 py-3 text-[var(--color-text-muted)] sm:table-cell">{t.email}</td>
              <td className="hidden px-4 py-3 tabular-nums text-[var(--color-text-muted)] sm:table-cell" dir="ltr">
                {t.phone || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
