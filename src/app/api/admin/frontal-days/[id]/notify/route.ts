import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-api";
import { renderTemplate } from "@/lib/frontal-days";
import { templateValues } from "@/lib/frontal-days-server";
import { hebrewDateLabel } from "@/lib/group-lessons-server";
import { sendNotice } from "@/lib/email";
import { isValidDeliveryEmail } from "@/lib/validation";

/** Sends the (edited) message or reminder again to everyone registered for the day. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { kind?: unknown } | null;
  const kind = body?.kind === "reminder" ? "reminder" : "message";
  const day = await prisma.frontalDay.findUnique({ where: { id }, include: { signups: { select: { teacherId: true } } } });
  if (!day) return NextResponse.json({ error: "היום לא נמצא" }, { status: 404 });
  if (day.status !== "open") return NextResponse.json({ error: "היום בוטל" }, { status: 400 });
  const teachers = await prisma.user.findMany({ where: { id: { in: day.signups.map((s) => s.teacherId) } }, select: { email: true, name: true } });
  const recipients = teachers.filter((t) => isValidDeliveryEmail(t.email));
  if (recipients.length === 0) return NextResponse.json({ error: "אין מורים רשומים ליום הזה" }, { status: 400 });

  const template = kind === "reminder" ? day.reminderTemplate : day.messageTemplate;
  const subject = `עדכון: היום הפרונטלי ב${day.title}, ${hebrewDateLabel(day.date)}`;
  for (const t of recipients) {
    const body = renderTemplate(template, templateValues(day, t.name?.trim() || "מורה"));
    await sendNotice("sendFrontalDayUpdate", [t.email], subject, "עדכון ליום הפרונטלי", body.split(/\n{2,}/), {
      label: "לפרטי היום",
      path: `/teacher/frontal-days/${day.id}`,
    });
  }
  return NextResponse.json({ ok: true, sent: recipients.length });
}
