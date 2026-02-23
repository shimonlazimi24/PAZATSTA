"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { apiJson } from "@/lib/api";

type ProfileResponse = {
  studentFullName?: string | null;
  parentFullName?: string | null;
  parentPhone?: string | null;
  currentScreeningType?: string | null;
  currentScreeningDate?: string | null;
};

export default function StudentWelcomePage() {
  const [linkHref, setLinkHref] = useState("/student/profile");

  useEffect(() => {
    apiJson<ProfileResponse>("/api/student/profile").then((r) => {
      if (r.ok) {
        const p = r.data;
        if (p.currentScreeningType?.trim() && (p.studentFullName?.trim() || p.parentFullName?.trim())) {
          setLinkHref("/student/book");
        }
      }
    });
  }, []);

  return (
    <AppShell title="ברוך/ה הבא/ה">
      <div className="max-w-xl mx-auto text-center space-y-6" dir="rtl">
        <p className="text-[var(--color-text)]">
          ברוך/ה הבא/ה למערכת קביעת השיעורים. נמשיך להשלמת הפרטים ולבחירת נושא המיון.
        </p>
        <Link
          href={linkHref}
          className="inline-block rounded-[var(--radius-input)] bg-[var(--color-primary)] px-6 py-3 text-white font-medium hover:opacity-90"
        >
          המשך
        </Link>
      </div>
    </AppShell>
  );
}
