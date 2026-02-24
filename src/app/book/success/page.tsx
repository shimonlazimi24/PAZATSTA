"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/design/Button";
import { Card } from "@/components/design/Card";
import { BackLink } from "@/components/design/BackLink";

const STORAGE_KEY = "paza_last_booking";

type BookingInfo = {
  subjectTitle?: string;
  teacherName?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: string;
};

function CheckCircleIcon() {
  return (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default function BookSuccessPage() {
  const [booking, setBooking] = useState<BookingInfo | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setBooking(JSON.parse(raw) as BookingInfo);
    } catch (_) {}
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center px-4 py-12">
      <Link href="/book" className="mb-8 shrink-0" aria-label="Paza">
        <Logo alt="Paza" className="h-7 w-auto object-contain" width={100} height={28} />
      </Link>
      <Card className="max-w-md w-full text-center flex-1 flex flex-col justify-center">
        {booking?.status === "pending_approval" ? (
          <>
            <div className="flex justify-center">
              <div className="text-amber-600"><ClockIcon /></div>
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-[var(--color-text)]">
              הבקשה נשלחה — ממתינה לאישור
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              השיעור יאושר על ידי המורה או האדמין. המשבצת שמורה לשעתיים; אם לא יאושר — תשוחרר ותוכלו לבחור זמן אחר.
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              תקבלו אימייל עם פרטי השיעור אחרי האישור. במידה ויש שאלות — צרו קשר.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <BackLink href="/book" label="חזרה לקביעת שיעור" />
              <Link href="/book">
                <Button variant="primary" showArrow className="w-full justify-center">
                  חזרה לדף הבית
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="text-[var(--color-primary)]"><CheckCircleIcon /></div>
            </div>
            <h1 className="mt-4 text-2xl font-extrabold text-[var(--color-text)]">
              השיעור נקבע בהצלחה
            </h1>
            <p className="mt-2 text-[var(--color-text-muted)]">
              קיבלתם אימייל עם פרטי השיעור. במידה ויש שאלות — צרו קשר.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <BackLink href="/book" label="חזרה לקביעת שיעור" />
              <Link href="/book">
                <Button variant="primary" showArrow className="w-full justify-center">
                  חזרה לדף הבית
                </Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
