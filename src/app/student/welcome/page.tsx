"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function StudentWelcomePage() {
  return (
    <AppShell title="ברוך/ה הבא/ה">
      <div className="max-w-xl mx-auto text-center space-y-6" dir="rtl">
        <p className="text-[var(--color-text)]">
          ברוך/ה הבא/ה למערכת קביעת השיעורים. נמשיך להשלמת הפרטים ולבחירת נושא המיון.
        </p>
        <Link
          href="/student/profile"
          className="inline-block rounded-[var(--radius-input)] bg-[var(--color-primary)] px-6 py-3 text-white font-medium hover:opacity-90"
        >
          המשך
        </Link>
      </div>
    </AppShell>
  );
}
