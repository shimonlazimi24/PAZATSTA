import Link from "next/link";
import { prisma } from "@/lib/db";
import { addDaysYYYYMMDD, todayIsraelYYYYMMDD } from "@/lib/dates";
import { AdminPageHeader } from "./AdminPageHeader";
import { monthKeyOf, monthLabel, monthRange, nextMonthKey } from "@/lib/group-lessons";
import { NO_TEACHER_ALERT_DAYS } from "@/lib/frontal-days";

/** Lesson.date is stored as UTC midnight of the Israeli calendar date. */
const asLessonDate = (yyyymmdd: string) => new Date(`${yyyymmdd}T00:00:00.000Z`);

const SOON_MS = 6 * 60 * 60 * 1000;

async function loadAttention() {
  const now = new Date();
  const today = todayIsraelYYYYMMDD();
  const todayDate = asLessonDate(today);
  const weekEnd = asLessonDate(addDaysYYYYMMDD(today, 7));
  const pendingWhere = {
    status: "pending_approval" as const,
    OR: [{ approvalExpiresAt: null }, { approvalExpiresAt: { gt: now } }],
  };
  const missingWhere = { status: "scheduled" as const, workshopId: null, date: { lt: todayDate } };

  const [pending, pendingSoon, missingReports, missingByTeacher, todayLessons, weekLessons] = await Promise.all([
    prisma.lesson.count({ where: pendingWhere }),
    prisma.lesson.count({
      where: { status: "pending_approval", approvalExpiresAt: { gt: now, lte: new Date(now.getTime() + SOON_MS) } },
    }),
    prisma.lesson.count({ where: missingWhere }),
    prisma.lesson.groupBy({
      by: ["teacherId"],
      where: missingWhere,
      _count: { _all: true },
      orderBy: { _count: { teacherId: "desc" } },
      take: 5,
    }),
    prisma.lesson.count({ where: { date: todayDate, status: { in: ["scheduled", "pending_approval"] } } }),
    prisma.lesson.count({ where: { date: { gte: todayDate, lt: weekEnd }, status: "scheduled" } }),
  ]);

  // Frontal days and group lessons: what is waiting on the admin there.
  const frontalHorizon = asLessonDate(addDaysYYYYMMDD(today, NO_TEACHER_ALERT_DAYS));
  const nextMonth = nextMonthKey(monthKeyOf(today));
  const { start: nmStart, end: nmEnd } = monthRange(nextMonth);
  // Missing reports older than this are no longer worth chasing on the home screen.
  const reportLookback = asLessonDate(addDaysYYYYMMDD(today, -90));
  const [reportsToApprove, unstaffedDays, nextMonthLessons, teachers, pastGroup, frontalNoReport] = await Promise.all([
    prisma.frontalDayReport.count({ where: { status: "submitted" } }),
    prisma.frontalDay.count({ where: { status: "open", date: { gte: todayDate, lte: frontalHorizon }, signups: { none: {} } } }),
    prisma.groupLesson.findMany({ where: { status: "open", date: { gte: nmStart, lt: nmEnd } }, select: { signups: { select: { teacherId: true } } } }),
    prisma.user.count({ where: { role: "teacher" } }),
    prisma.groupLesson.findMany({
      where: { status: "open", date: { lt: todayDate, gte: reportLookback }, signups: { some: {} } },
      select: { signups: { select: { teacherId: true } }, reports: { select: { teacherId: true } } },
    }),
    prisma.frontalDay.count({ where: { status: "open", date: { lt: todayDate, gte: reportLookback }, signups: { some: {} }, report: null } }),
  ]);
  // A group lesson is missing a report while any teacher who taught it has not sent one.
  const groupNoReport = pastGroup.filter((l) => {
    const reported = new Set(l.reports.map((r) => r.teacherId));
    return l.signups.some((s) => !reported.has(s.teacherId));
  }).length;
  const signedNextMonth = new Set(nextMonthLessons.flatMap((l) => l.signups.map((s) => s.teacherId)));
  const groupMissing = nextMonthLessons.length > 0 && Number(today.slice(8, 10)) >= 15 ? Math.max(0, teachers - signedNextMonth.size) : 0;

  const names = missingByTeacher.length
    ? await prisma.user.findMany({
        where: { id: { in: missingByTeacher.map((r) => r.teacherId) } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const nameOf = new Map(names.map((u) => [u.id, u.name || u.email]));

  return {
    pending,
    pendingSoon,
    missingReports,
    missingTop: missingByTeacher.map((r) => ({ name: nameOf.get(r.teacherId) ?? "—", count: r._count._all })),
    todayLessons,
    weekLessons,
    reportsToApprove,
    unstaffedDays,
    groupMissing,
    groupNoReport,
    frontalNoReport,
    nextMonthLabel: monthLabel(nextMonth),
  };
}

/** One thing waiting on the admin: how many, what it means, and where to deal with it. */
function AttentionRow({
  count,
  title,
  detail,
  href,
  action,
  children,
}: {
  count: number;
  title: string;
  detail: string;
  href: string;
  action: string;
  children?: React.ReactNode;
}) {
  const waiting = count > 0;
  return (
    <li className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:gap-6">
      <p
        className={`w-14 shrink-0 text-4xl font-bold leading-none tabular-nums ${
          waiting ? "text-amber-700" : "text-[var(--color-text-muted)]"
        }`}
      >
        {count}
      </p>
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-base font-semibold text-[var(--color-text)]">{title}</h3>
        <p className="text-sm text-[var(--color-text-muted)]">{detail}</p>
        {children}
      </div>
      {waiting && (
        <Link
          href={href}
          className="inline-flex min-h-[40px] shrink-0 items-center self-start rounded-[var(--radius-input)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:opacity-90"
        >
          {action}
        </Link>
      )}
    </li>
  );
}

export async function AdminHome() {
  let data: Awaited<ReturnType<typeof loadAttention>> | null = null;
  try {
    data = await loadAttention();
  } catch (e) {
    console.error("[admin/home] failed to load attention items:", e);
  }

  if (!data) {
    return (
      <div className="max-w-3xl">
        <AdminPageHeader title="דורש טיפול" />
        <p className="rounded-[var(--radius-input)] bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          לא הצלחנו לטעון את הנתונים. רעננו את הדף בעוד רגע.
        </p>
      </div>
    );
  }

  const nothingWaiting =
    data.pending === 0 && data.missingReports === 0 && data.reportsToApprove === 0 && data.unstaffedDays === 0 && data.groupMissing === 0 &&
    data.groupNoReport === 0 && data.frontalNoReport === 0;

  return (
    <div className="max-w-3xl">
      <AdminPageHeader title="דורש טיפול" description="מה מחכה לכם עכשיו, מהדחוף ביותר." />

      {nothingWaiting ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-5 py-6 text-[var(--color-text)]">
          אין כרגע שום דבר שמחכה לטיפול.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white px-5">
          <AttentionRow
            count={data.pending}
            title="בקשות שממתינות לאישור"
            detail={
              data.pendingSoon > 0
                ? `${data.pendingSoon} מהן יתבטלו אוטומטית בשש השעות הקרובות אם לא יאושרו.`
                : "בקשה שלא מאושרת תוך 24 שעות מתבטלת אוטומטית."
            }
            href="/admin/pending"
            action="לאישור בקשות"
          />
          <AttentionRow
            count={data.missingReports}
            title="שיעורים שעברו בלי דוח"
            detail="המדריך עוד לא מילא דוח ולא סימן שהשיעור לא התקיים."
            href="/admin/calendar"
            action="ללוח השבועי"
          >
            {data.missingTop.length > 0 && (
              <table className="mt-2 text-sm">
                <tbody>
                  {data.missingTop.map((t) => (
                    <tr key={t.name}>
                      <td className="py-0.5 pe-6 text-[var(--color-text)]">{t.name}</td>
                      <td className="py-0.5 tabular-nums text-[var(--color-text-muted)]">
                        {t.count === 1 ? "שיעור אחד" : `${t.count} שיעורים`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </AttentionRow>
          {data.groupNoReport > 0 && (
            <AttentionRow
              count={data.groupNoReport}
              title="שיעורים קבוצתיים שעברו בלי דוח"
              detail="לפחות אחד מהמדריכים ששובצו עוד לא שלח דוח. הסיכום של כל שיעור מופיע ברשימת השיעורים."
              href="/admin/group-lessons"
              action="לשיעורים הקבוצתיים"
            />
          )}
          {data.frontalNoReport > 0 && (
            <AttentionRow
              count={data.frontalNoReport}
              title="ימים פרונטליים שעברו בלי דוח סיום"
              detail="אף מדריך עוד לא הגיש את דוח הסיום של היום."
              href="/admin/frontal-days"
              action="לימים הפרונטליים"
            />
          )}
          {data.reportsToApprove > 0 && (
            <AttentionRow
              count={data.reportsToApprove}
              title="דוחות סיום של ימים פרונטליים לאישור"
              detail="אחרי האישור הדוח נשלח אוטומטית אל בית הספר או המקום."
              href="/admin/frontal-days"
              action="לימים הפרונטליים"
            />
          )}
          {data.unstaffedDays > 0 && (
            <AttentionRow
              count={data.unstaffedDays}
              title="ימים פרונטליים בשבועיים הקרובים בלי מדריכים"
              detail="אף מדריך לא נרשם. אפשר לשבץ מדריך מתוך עמוד היום."
              href="/admin/frontal-days"
              action="לשיבוץ מדריכים"
            />
          )}
          {data.groupMissing > 0 && (
            <AttentionRow
              count={data.groupMissing}
              title={`מדריכים שעוד לא נרשמו לשיעור קבוצתי ב${data.nextMonthLabel}`}
              detail="כל מדריך מעביר לפחות שיעור קבוצתי אחד בחודש. ב-20 לחודש הם מקבלים תזכורת אוטומטית."
              href="/admin/group-lessons"
              action="לשיעורים הקבוצתיים"
            />
          )}
        </ul>
      )}

      <p className="mt-6 text-sm text-[var(--color-text-muted)]">
        היום מתוכננים {data.todayLessons} שיעורים, ובשבוע הקרוב {data.weekLessons} שיעורים מאושרים.{" "}
        <Link href="/admin/calendar" className="font-medium text-[var(--color-primary)] hover:underline">
          ללוח השבועי
        </Link>
      </p>
    </div>
  );
}
