import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-api";
import { resolveAdminRecipients } from "@/lib/admin";
import { nowIsraelHHMM, todayIsraelYYYYMMDD } from "@/lib/dates";
import { MAX_PARTICIPANTS, canReport, hasStarted, typeLabel } from "@/lib/group-lessons";
import { emailInfo, firstZodMessage, lessonDateStr } from "@/lib/group-lessons-server";
import { sendGroupLessonReportToAdmins } from "@/lib/email";

const ReportInput = z.object({
  typeId: z.string().min(1, "בחרו את סוג השיעור"),
  participants: z.coerce.number().int("מספר שלם בלבד").min(0, "מספר לא תקין").max(MAX_PARTICIPANTS, "מספר גדול מדי"),
  notes: z.string().trim().max(4000).optional().default(""),
});

/** What the report form needs: the lesson, the types to choose from, and whether a report can be sent. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const me = auth.user.id;
  const lesson = await prisma.groupLesson.findUnique({
    where: { id },
    include: { type: true, signups: { where: { teacherId: me }, select: { id: true } }, reports: { where: { teacherId: me } } },
  });
  if (!lesson) return NextResponse.json({ error: "השיעור לא נמצא" }, { status: 404 });
  const types = await prisma.groupLessonType.findMany({
    where: { OR: [{ active: true }, { id: lesson.typeId }] },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
  const verdict = canReport({
    status: lesson.status,
    started: hasStarted(lessonDateStr(lesson.date), lesson.startTime, todayIsraelYYYYMMDD(), nowIsraelHHMM()),
    signed: lesson.signups.length > 0,
    alreadyReported: lesson.reports.length > 0,
  });
  const report = lesson.reports[0];
  return NextResponse.json(
    {
      lesson: { ...emailInfo(lesson), typeId: lesson.typeId },
      types: types.map((t) => ({ id: t.id, category: t.category, name: t.name })),
      canReport: verdict.ok,
      reason: verdict.ok ? null : verdict.message,
      submitted: report ? { typeLabel: report.typeLabel, participants: report.participants, notes: report.notes } : null,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/** The teacher's report after a group lesson. Saved once, then sent to the admins. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const me = auth.user;
  const parsed = ReportInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstZodMessage(parsed.error) }, { status: 400 });

  const lesson = await prisma.groupLesson.findUnique({
    where: { id },
    include: { type: true, signups: { where: { teacherId: me.id }, select: { id: true } }, reports: { where: { teacherId: me.id }, select: { id: true } } },
  });
  if (!lesson) return NextResponse.json({ error: "השיעור לא נמצא" }, { status: 404 });
  const verdict = canReport({
    status: lesson.status,
    started: hasStarted(lessonDateStr(lesson.date), lesson.startTime, todayIsraelYYYYMMDD(), nowIsraelHHMM()),
    signed: lesson.signups.length > 0,
    alreadyReported: lesson.reports.length > 0,
  });
  if (!verdict.ok) return NextResponse.json({ error: verdict.message }, { status: 409 });

  const reportedType = await prisma.groupLessonType.findUnique({ where: { id: parsed.data.typeId } });
  if (!reportedType) return NextResponse.json({ error: "בחרו את סוג השיעור" }, { status: 400 });

  try {
    await prisma.groupLessonReport.create({
      data: {
        groupLessonId: id,
        teacherId: me.id,
        typeLabel: typeLabel(reportedType),
        participants: parsed.data.participants,
        notes: parsed.data.notes,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "כבר שלחת דוח על השיעור הזה" }, { status: 409 });
    }
    throw e;
  }

  const admins = await resolveAdminRecipients();
  await sendGroupLessonReportToAdmins(admins, {
    ...emailInfo(lesson),
    teacherName: me.name || me.email,
    reportedType: typeLabel(reportedType),
    participants: parsed.data.participants,
    notes: parsed.data.notes,
  }).catch((e) => console.error("[group-lessons report] admin email failed", e));

  return NextResponse.json({ ok: true }, { status: 201 });
}
