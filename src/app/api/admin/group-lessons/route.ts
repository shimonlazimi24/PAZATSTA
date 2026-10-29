import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, missingTableResponse } from "@/lib/admin-api";
import { isMonthKey, monthKeyOf, monthRange, teachersWithoutSignup, typeLabel } from "@/lib/group-lessons";
import { GroupLessonInput, firstZodMessage, lessonDateFromStr, lessonDateStr } from "@/lib/group-lessons-server";
import { todayIsraelYYYYMMDD } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** A month of group lessons, with who signed up, and the teachers still missing their monthly lesson. */
export async function GET(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const monthParam = new URL(req.url).searchParams.get("month");
  const month = isMonthKey(monthParam) ? monthParam : monthKeyOf(todayIsraelYYYYMMDD());
  const { start, end } = monthRange(month);
  try {
    const [lessons, teachers] = await Promise.all([
      prisma.groupLesson.findMany({
        where: { date: { gte: start, lt: end } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: {
          type: true,
          signups: { select: { teacherId: true } },
          reports: { select: { teacherId: true, typeLabel: true, participants: true, notes: true }, orderBy: { submittedAt: "asc" } },
        },
      }),
      prisma.user.findMany({ where: { role: "teacher" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }),
    ]);
    const nameOf = new Map(teachers.map((t) => [t.id, t.name || t.email]));
    const signedThisMonth = lessons.filter((l) => l.status === "open").flatMap((l) => l.signups.map((s) => s.teacherId));
    return NextResponse.json(
      {
        month,
        lessons: lessons.map((l) => ({
          id: l.id,
          date: lessonDateStr(l.date),
          startTime: l.startTime,
          endTime: l.endTime,
          location: l.location,
          status: l.status,
          typeLabel: typeLabel(l.type),
          teachersNeeded: l.teachersNeeded,
          teachers: l.signups.map((s) => ({ id: s.teacherId, name: nameOf.get(s.teacherId) ?? "—" })),
          reportsCount: l.reports.length,
          reports: l.reports.map((r) => ({
            teacherName: nameOf.get(r.teacherId) ?? "—",
            typeLabel: r.typeLabel,
            participants: r.participants,
            notes: r.notes,
          })),
        })),
        missingTeachers: teachersWithoutSignup(teachers, signedThisMonth).map((t) => ({ id: t.id, name: t.name || t.email })),
        teacherCount: teachers.length,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const missing = missingTableResponse(e);
    if (missing) return missing;
    console.error("[admin/group-lessons GET]", e);
    return NextResponse.json({ error: "שגיאה בטעינת השיעורים" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const parsed = GroupLessonInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });
  const v = parsed.data;
  if (v.date < todayIsraelYYYYMMDD()) return NextResponse.json({ error: "התאריך כבר עבר" }, { status: 400 });
  const type = await prisma.groupLessonType.findUnique({ where: { id: v.typeId }, select: { active: true } });
  if (!type?.active) return NextResponse.json({ error: "סוג השיעור לא זמין" }, { status: 400 });
  const created = await prisma.groupLesson.create({
    data: {
      typeId: v.typeId,
      date: lessonDateFromStr(v.date),
      startTime: v.startTime,
      endTime: v.endTime,
      location: v.location || null,
      details: v.details || null,
      teachersNeeded: v.teachersNeeded,
    },
    select: { id: true },
  });
  return NextResponse.json(created, { status: 201 });
}
