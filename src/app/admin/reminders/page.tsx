import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RunRemindersButton } from "@/components/admin/RunRemindersButton";
import { REMINDER_MARKS_HOURS_LEFT, summarizeReminders } from "@/lib/approval-reminders";

const PERIODS = [7, 30, 90] as const;

export default async function AdminRemindersPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: daysParam } = await searchParams;
  const days = PERIODS.find((p) => String(p) === daysParam) ?? 30;
  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const [reminders, lessons, recent] = await Promise.all([
    prisma.approvalReminder.findMany({
      where: { sentAt: { gte: since } },
      select: { lessonId: true, teacherId: true, mark: true, sentAt: true },
    }),
    prisma.lesson.findMany({
      where: { createdAt: { gte: since }, workshopId: null, approvalExpiresAt: { not: null } },
      select: {
        id: true,
        teacherId: true,
        status: true,
        createdAt: true,
        approvedByTeacherAt: true,
        approvedByAdminAt: true,
        approvalExpiresAt: true,
        canceledAt: true,
      },
    }),
    prisma.approvalReminder.findMany({
      where: { sentAt: { gte: since } },
      orderBy: { sentAt: "desc" },
      take: 20,
      select: {
        id: true,
        mark: true,
        channel: true,
        sentAt: true,
        teacherId: true,
        lesson: { select: { date: true, startTime: true, status: true, student: { select: { name: true, email: true } } } },
      },
    }),
  ]);

  const stats = summarizeReminders(reminders, lessons, now);
  const teacherIds = Array.from(new Set([...stats.map((s) => s.teacherId), ...recent.map((r) => r.teacherId)]));
  const teachers = await prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true, email: true } });
  const nameOf = new Map(teachers.map((t) => [t.id, t.name || t.email]));
  const fmt = (d: Date) =>
    d.toLocaleString("he-IL", { timeZone: "Asia/Jerusalem", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  const statusLabel: Record<string, string> = {
    pending_approval: "עדיין ממתין",
    scheduled: "אושר",
    completed: "אושר והושלם",
    canceled: "בוטל",
  };

  const hasData = stats.some((x) => x.remindersSent > 0 || x.expiredUnapproved > 0) || recent.length > 0;
  const periodLabel = days === 7 ? "בשבוע האחרון" : `ב-${days} הימים האחרונים`;

  return (
    <div className="max-w-4xl space-y-8">
      <AdminPageHeader
        title="תזכורות אישור למדריכים"
        description="תלמיד שמזמין שיעור מחכה לאישור של המדריך. כאן רואים איזה מדריך מאשר בזמן ואיזה צריך תזכורות."
      />

      <section aria-labelledby="how-h" className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
        <h3 id="how-h" className="text-sm font-semibold text-[var(--color-text)]">מה קורה לבקשה שלא אושרה</h3>
        <ol className="mt-4 grid gap-4 sm:grid-cols-4">
          {[
            ["מיד", "המדריך מקבל מייל עם הבקשה"],
            [`אחרי ${24 - REMINDER_MARKS_HOURS_LEFT[0]} שעות`, "תזכורת ראשונה, אם עוד לא אישר"],
            [`אחרי ${24 - REMINDER_MARKS_HOURS_LEFT[1]} שעות`, "תזכורת שנייה"],
            ["אחרי 24 שעות", "הבקשה מתבטלת אוטומטית"],
          ].map(([when, what], i) => (
            <li key={when} className="flex gap-3 sm:block">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  i === 3 ? "bg-red-50 text-red-700" : "bg-[var(--color-bg-muted)] text-[var(--color-text)]"
                }`}
              >
                {i + 1}
              </span>
              <span className="sm:mt-2 sm:block">
                <span className="block text-sm font-semibold text-[var(--color-text)]">{when}</span>
                <span className="block text-sm text-[var(--color-text-muted)]">{what}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="who-h" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="who-h" className="text-lg font-semibold text-[var(--color-text)]">מדריכים שקיבלו תזכורות</h3>
          <div className="inline-flex rounded-md border border-[var(--color-border)] bg-white p-0.5" role="group" aria-label="תקופה">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin/reminders?days=${p}`}
                aria-current={p === days ? "page" : undefined}
                className={`rounded px-3 py-1.5 text-sm ${p === days ? "bg-[var(--color-bg-muted)] font-semibold text-[var(--color-text)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"}`}
              >
                {p === 7 ? "שבוע" : `${p} ימים`}
              </Link>
            ))}
          </div>
        </div>

        {!hasData ? (
          <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-white px-5 py-8 text-center text-[var(--color-text)]">
            לא נשלחו תזכורות {periodLabel}. כל הבקשות אושרו בזמן, או שלא היו בקשות.
            <span className="mt-1 block text-sm text-[var(--color-text-muted)]">כשמדריך לא יאשר בקשה תוך {24 - REMINDER_MARKS_HOURS_LEFT[0]} שעות, הוא יופיע כאן.</span>
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
              <table className="w-full min-w-[640px] text-right text-sm">
                <thead className="bg-[var(--color-bg-muted)] text-[var(--color-text-muted)]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">מדריך</th>
                    <th className="px-4 py-2.5 font-medium">תזכורות</th>
                    <th className="px-4 py-2.5 font-medium">אישר אחרי תזכורת</th>
                    <th className="px-4 py-2.5 font-medium">בקשות שבוטלו כי לא אישר</th>
                    <th className="px-4 py-2.5 font-medium">זמן אישור רגיל</th>
                  </tr>
                </thead>
                <tbody>
                  {stats
                    .filter((x) => x.remindersSent > 0 || x.expiredUnapproved > 0)
                    .map((x) => (
                      <tr key={x.teacherId} className="border-t border-[var(--color-border)]">
                        <td className="px-4 py-3 font-medium">{nameOf.get(x.teacherId) ?? "—"}</td>
                        <td className="px-4 py-3 tabular-nums">{x.remindersSent}</td>
                        <td className="px-4 py-3 tabular-nums">{x.approvedAfterReminder}</td>
                        <td className={`px-4 py-3 tabular-nums ${x.expiredUnapproved > 0 ? "font-semibold text-red-700" : ""}`}>{x.expiredUnapproved}</td>
                        <td className="px-4 py-3">
                          {x.medianHoursToApprove === null ? "—" : x.medianHoursToApprove < 1 ? "פחות משעה" : `כ-${Math.round(x.medianHoursToApprove)} שעות`}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {recent.length > 0 && (
              <details className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
                <summary className="cursor-pointer px-5 py-3 text-sm font-medium">התזכורות האחרונות שנשלחו ({recent.length})</summary>
                <div className="overflow-x-auto border-t border-[var(--color-border)]">
                  <table className="w-full min-w-[600px] text-right text-sm">
                    <thead className="text-[var(--color-text-muted)]">
                      <tr>
                        <th className="px-4 py-2 font-medium">מדריך</th>
                        <th className="px-4 py-2 font-medium">תלמיד</th>
                        <th className="px-4 py-2 font-medium">מועד השיעור</th>
                        <th className="px-4 py-2 font-medium">נשלחה</th>
                        <th className="px-4 py-2 font-medium">מצב הבקשה עכשיו</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recent.map((r) => (
                        <tr key={r.id} className="border-t border-[var(--color-border)]">
                          <td className="px-4 py-2">{nameOf.get(r.teacherId) ?? "—"}</td>
                          <td className="px-4 py-2">{r.lesson.student.name || r.lesson.student.email}</td>
                          <td className="px-4 py-2 tabular-nums">
                            {r.lesson.date.toLocaleDateString("he-IL", { timeZone: "UTC", day: "numeric", month: "numeric" })} {r.lesson.startTime}
                          </td>
                          <td className="px-4 py-2 tabular-nums">{fmt(r.sentAt)}</td>
                          <td className="px-4 py-2">{statusLabel[r.lesson.status] ?? r.lesson.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </>
        )}
      </section>

      <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-5 text-sm text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
        <p>המערכת בודקת כל רבע שעה ושולחת תזכורות לבד. אין צורך לעשות כלום.</p>
        <RunRemindersButton />
      </div>
    </div>
  );
}
