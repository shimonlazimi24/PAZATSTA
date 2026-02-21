"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/design/Button";
import { Card } from "@/components/design/Card";
import { BackLink } from "@/components/design/BackLink";
import { addToCalendar } from "@/lib/calendar";

const STORAGE_KEY = "paza_last_booking";

type BookingInfo = {
  subjectTitle: string;
  teacherName: string;
  date: string;
  startTime: string;
  endTime: string;
};

function CheckCircleIcon() {
  return (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

  const addToCalendarClick = useCallback(() => {
    if (!booking?.date) return;
    const title = `שיעור פאזה${booking.subjectTitle ? ` - ${booking.subjectTitle}` : ""}${booking.teacherName ? ` (${booking.teacherName})` : ""}`;
    addToCalendar({
      date: booking.date,
      startTime: booking.startTime || "09:00",
      endTime: booking.endTime || "09:45",
      title,
    });
  }, [booking]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full text-center">
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
          <Link href="/welcome">
            <Button variant="primary" showArrow className="w-full justify-center">
              חזרה לדף הבית
            </Button>
          </Link>
          <button
            type="button"
            onClick={addToCalendarClick}
            disabled={!booking?.date}
            className="rounded-full border border-[var(--color-border)] bg-white px-6 py-3 text-sm font-semibold text-[var(--color-text)] hover:bg-[var(--color-bg-muted)] disabled:opacity-50 disabled:pointer-events-none"
          >
            הוספה ליומן
          </button>
        </div>
      </Card>
    </div>
  );
}
