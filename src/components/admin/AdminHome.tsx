import Link from "next/link";
import { prisma } from "@/lib/db";
import { addDaysYYYYMMDD, todayIsraelYYYYMMDD } from "@/lib/dates";
import { AdminPageHeader } from "./AdminPageHeader";

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
  };
}

function AttentionCard({
  count,
  title,
  detail,
  href,
  cta,
  tone,
  children,
}: {
  count: number;
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone: "alert" | "info";
  children?: React.ReactNode;
}) {
  const needsAction = tone === "alert" && count > 0;
  return (
    <div
      className={`rounded-[var(--radius-card)] border bg-white p-5 shadow-[var(--shadow-card)] ${
        needsAction ? "border-amber-300" : "border-[var(--color-border)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 text-right">
          <p className="text-sm font-medium text-[var(--color-text-muted)]">{title}</p>
          <p className={`text-3xl font-bold tabular-nums ${needsAction ? "text-amber-700" : "text-[var(--color-text)]"}`}>
            {count}
          </p>
        </div>
        {needsAction && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">דורש טיפול</span>
        )}
      </div>
      <p className="mt-2 text-sm text-[var(--color-text-muted)] text-right">{detail}</p>
      {children}
      <Link href={href} className="mt-4 inline-block text-sm font-medium text-[var(--color-primary)] hover:underline">
        {cta} ←
      </Link>
    </div>
  );
}

export async function AdminHome() {
  let data: Awaited<ReturnType<typeof loadAttention>> | null = null;
  try {
    data = await loadAttention();
  } catch (e) {
    console.error("[admin/home] failed to load attention items:", e);
  }

  return (
    <div className="max-w-4xl">
      <AdminPageHeader title="דורש טיפול" description="מה מחכה לכם עכשיו. כל כרטיס מוביל למסך שבו מטפלים בזה." />
      {!data ? (
        <p className="rounded-[var(--radius-input)] bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          לא הצלחנו לטעון את הנתונים. רעננו את הדף בעוד רגע.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <AttentionCard
            tone="alert"
            count={data.pending}
            title="ממתינים לאישור"
            detail={
              data.pendingSoon > 0
                ? `${data.pendingSoon} מהם יתבטלו אוטומטית בשש השעות הקרובות אם לא יאושרו.`
                : "בקשות שהמדריך עוד לא אישר."
            }
            href="/admin/pending"
            cta="לאישור בקשות"
          />
          <AttentionCard
            tone="alert"
            count={data.missingReports}
            title="שיעורים שעברו בלי דוח"
            detail="שיעורים שמועדם עבר והמדריך עוד לא מילא דוח או סימן שלא התקיימו."
            href="/admin/calendar"
            cta="ללוח השבועי"
          >
            {data.missingTop.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-right">
                {data.missingTop.map((t) => (
                  <li key={t.name} className="flex justify-between gap-2">
                    <span className="text-[var(--color-text)]">{t.name}</span>
                    <span className="tabular-nums text-[var(--color-text-muted)]">{t.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </AttentionCard>
          <AttentionCard
            tone="info"
            count={data.todayLessons}
            title="שיעורים היום"
            detail="מתוזמנים או ממתינים לאישור."
            href="/admin/calendar"
            cta="ללוח השבועי"
          />
          <AttentionCard
            tone="info"
            count={data.weekLessons}
            title="שיעורים בשבוע הקרוב"
            detail="שיעורים מאושרים בשבעת הימים הקרובים."
            href="/admin/calendar"
            cta="ללוח השבועי"
          />
        </div>
      )}
    </div>
  );
}
