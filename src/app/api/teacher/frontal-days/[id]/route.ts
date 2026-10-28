import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/teacher-api";
import { todayIsraelYYYYMMDD } from "@/lib/dates";
import { canWithdraw, renderTemplate, wazeUrl } from "@/lib/frontal-days";
import { templateValues } from "@/lib/frontal-days-server";
import { lessonDateStr } from "@/lib/group-lessons-server";

export const dynamic = "force-dynamic";

/**
 * One day for a teacher. Contact details, the WhatsApp link, the course code and
 * the QR targets are only returned to teachers registered for the day.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireTeacher();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const me = auth.user;
  const day = await prisma.frontalDay.findUnique({ where: { id }, include: { signups: true, report: true } });
  if (!day) return NextResponse.json({ error: "היום לא נמצא" }, { status: 404 });
  const mine = day.signups.find((s) => s.teacherId === me.id);
  const today = todayIsraelYYYYMMDD();
  const date = lessonDateStr(day.date);
  if (!mine && (day.status !== "open" || date <= today)) return NextResponse.json({ error: "היום לא נמצא" }, { status: 404 });

  const base = {
    id: day.id,
    title: day.title,
    date,
    startTime: day.startTime,
    endTime: day.endTime,
    address: day.address,
    topic: day.topic,
    status: day.status,
    placesLeft: Math.max(0, day.teachersNeeded - day.signups.length),
    mine: !!mine,
    past: date < today,
  };
  if (!mine) return NextResponse.json(base, { headers: { "Cache-Control": "no-store" } });

  const fields = await prisma.frontalReportField.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const report = day.report;
  const otherTeacherReported = !!report && report.teacherId !== me.id;
  return NextResponse.json(
    {
      ...base,
      wazeUrl: wazeUrl(day.address),
      presentationUrl: day.presentationUrl,
      contactName: day.contactName,
      contactPhone: day.contactPhone,
      whatsappUrl: day.whatsappUrl,
      feedbackUrl: day.feedbackUrl,
      courseCode: day.courseCode,
      courseUrl: day.courseUrl,
      message: renderTemplate(day.messageTemplate, templateValues(day, me.name?.trim() || "מדריך/ה")),
      checklist: day.checklist,
      checklistDone: mine.checklistDone.filter((x) => day.checklist.includes(x)),
      canWithdraw: !base.past && canWithdraw({ dateStr: date, todayStr: today }).ok,
      reportFields: fields.map((f) => ({ id: f.id, label: f.label, kind: f.kind, required: f.required, help: f.help, options: f.options, showIfFieldId: f.showIfFieldId, showIfValues: f.showIfValues })),
      report: report
        ? {
            byMe: report.teacherId === me.id,
            status: report.status,
            adminNote: report.status === "returned" ? report.adminNote : "",
            answers: report.answers,
          }
        : null,
      otherTeacherReported,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
