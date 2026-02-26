import Link from "next/link";
import {
  getLoginCodeContent,
  getBookingConfirmationContent,
  getLessonCompletedContent,
  getScreeningFollowUpReminderContent,
  getAdminSummaryContent,
} from "@/lib/email";

const PREVIEWS = [
  {
    name: "קוד התחברות (OTP)",
    ...getLoginCodeContent("847291"),
  },
  {
    name: "שיעור נקבע",
    ...getBookingConfirmationContent({
      studentName: "רוני ישראלי",
      teacherName: "מיכל לוי",
      date: "2025-03-02",
      timeRange: "10:00–10:45",
    }),
  },
  {
    name: "סיכום שיעור (Lesson completed)",
    ...getLessonCompletedContent({
      studentName: "רוני ישראלי",
      teacherName: "מיכל לוי",
      date: "2025-02-18",
      publicPdfUrl: "https://example.com/p/lesson-summary/abc123token",
    }),
  },
  {
    name: "תזכורת למעקב (Follow-up)",
    ...getScreeningFollowUpReminderContent({
      studentName: "רוני ישראלי",
      screeningType: "יום המא״ה - מבחנים פסיכוטכניים",
      screeningDate: "2025-03-01",
      lastLessonDate: "2025-02-10",
    }),
  },
  {
    name: "סיכום אדמין",
    ...getAdminSummaryContent({
      startDate: "2025-02-11",
      endDate: "2025-02-18",
      lessons: [
        {
          date: "2025-02-15",
          startTime: "09:00",
          endTime: "09:45",
          teacherName: "מיכל לוי",
          studentName: "רוני ישראלי",
          summaryText: "חשיבה כמותית, הכנה למא״ה.",
          homeworkText: "עמוד 42.",
        },
        {
          date: "2025-02-18",
          startTime: "11:00",
          endTime: "11:45",
          teacherName: "יוסי אברהם",
          studentName: "ליאה לוי",
          summaryText: "—",
          homeworkText: "—",
        },
      ],
    }),
  },
];

export default function DevEmailsPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-muted)] p-6" dir="rtl">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">
            תצוגת אימיילים
          </h1>
          <Link
            href="/book"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            חזרה
          </Link>
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          זה הדף שבו אפשר לראות איך נראים האימיילים שנשלחים מהמערכת (נושא + גוף). התוכן זהה ל־src/lib/email.ts.
        </p>
        <div className="space-y-4">
          {PREVIEWS.map((p) => (
            <section
              key={p.name}
              className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 shadow-[var(--shadow-card)]"
            >
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                {p.name}
              </h2>
              <p className="text-xs text-[var(--color-text-muted)] mb-1 font-medium">
                נושא (Subject)
              </p>
              <p className="text-[var(--color-text)] mb-4 font-medium">
                {p.subject}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] mb-1 font-medium">
                גוף (Text)
              </p>
              <pre className="text-sm text-[var(--color-text)] whitespace-pre-wrap font-sans border border-[var(--color-border)] rounded-[var(--radius-input)] p-4 bg-[var(--color-bg-muted)]">
                {p.text}
              </pre>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
