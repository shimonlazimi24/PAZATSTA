import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { RunRemindersButton } from "@/components/admin/RunRemindersButton";
import { REMINDER_MARKS_HOURS_LEFT, summarizeReminders } from "@/lib/approval-reminders";

const PERIODS = [7, 30, 90] as const;

export default async function AdminRemindersPage({ searchParams }: { searchParams: { days?: string } }) {
  const days = PERIODS.find((p) => String(p) === searchParams.days) ?? 30;
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

  return (
    <div className="max-w-4xl space-y-6">
      <AdminPageHeader
        title="תזכורות אישור למדריכים"
        description={`מדריך שלא אישר בקשה מקבל תזכורת כשנותרו ${REMINDER_MARKS_HOURS_LEFT.join(" ו-")} שעות לחלון האישור. הבקשה עצמה נשלחת אליו מיד עם ההזמנה.`}
        actions={<RunRemindersButton />}
      />

      <div className="flex gap-2" role="tablist" aria-label="תקופה">
        {PERIODS.map((p) => (
          <Link
            key={p}
            href={`/admin/reminders?days=${p}`}
            aria-current={p === days ? "page" : undefined}
            className={`rounded-full px-3 py-1 text-sm ${
              p === days ? "bg-[var(--color-primary)] text-white" : "border border-[var(--color-border)] bg-white text-[var(--color-text)]"
            }`}
          >
            {p} ימים
          </Link>
        ))}
      </div>

      <section className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">לפי מדריך</h3>
        {stats.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">אין בקשות שיעור בתקופה הזו.</p>
        ) : (
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
                <th className="px-2 py-2 font-medium">מדריך</th>
                <th className="px-2 py-2 font-medium tabular-nums">תזכורות שנשלחו</th>
                <th className="px-2 py-2 font-medium tabular-nums">בקשות שקיבלו תזכורת</th>
                <th className="px-2 py-2 font-medium tabular-nums">אושרו אחרי תזכורת</th>
                <th className="px-2 py-2 font-medium tabular-nums">פגו בלי אישור</th>
                <th className="px-2 py-2 font-medium tabular-nums">זמן אישור (חציון, שעות)</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.teacherId} className="border-b border-[var(--color-border)]/60">
                  <td className="px-2 py-2">{nameOf.get(s.teacherId) ?? "—"}</td>
                  <td className="px-2 py-2 tabular-nums">{s.remindersSent}</td>
                  <td className="px-2 py-2 tabular-nums">{s.lessonsReminded}</td>
                  <td className="px-2 py-2 tabular-nums">{s.approvedAfterReminder}</td>
                  <td className={`px-2 py-2 tabular-nums ${s.expiredUnapproved > 0 ? "font-semibold text-red-700" : ""}`}>
                    {s.expiredUnapproved}
                  </td>
                  <td className="px-2 py-2 tabular-nums">{s.medianHoursToApprove ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-card)]">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text)]">תזכורות אחרונות</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">לא נשלחו תזכורות בתקופה הזו.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border)] text-sm">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{nameOf.get(r.teacherId) ?? "—"}</span>
                  <span className="text-[var(--color-text-muted)]">
                    {" "}· {r.lesson.student.name || r.lesson.student.email} · שיעור {r.lesson.date.toISOString().slice(0, 10)} {r.lesson.startTime}
                  </span>
                </span>
                <span className="text-[var(--color-text-muted)]">
                  {fmt(r.sentAt)} · נותרו {r.mark} שעות · {r.channel === "sms" ? "SMS" : "מייל"} · {statusLabel[r.lesson.status] ?? r.lesson.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
