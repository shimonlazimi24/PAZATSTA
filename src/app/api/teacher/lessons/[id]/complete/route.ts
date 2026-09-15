import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildTipsSnapshot,
  getReportFields,
  parseStoredSlugs,
  MAX_TIP_SELECTION,
} from "@/lib/report-template";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { sendLessonCompleted } from "@/lib/email";
import { createLessonSummaryLink } from "@/lib/publicPdfLink";
import { isLessonStarted } from "@/lib/dates";
import { formatDateInIsrael } from "@/lib/date-utils";
import { isValidEmail, isValidDeliveryEmail } from "@/lib/validation";
import { resolveAdminRecipients } from "@/lib/admin";

export const runtime = "nodejs";

/** Report fields are free text; bound them so a single request cannot store megabytes. */
const MAX_FIELD_LENGTH = 5000;

const text = () =>
  z.unknown().transform((v) => (typeof v === "string" ? v.trim() : "")).pipe(z.string().max(MAX_FIELD_LENGTH));

const ReportSchema = z.object({
  summaryText: text(),
  homeworkText: text(),
  pointsToKeep: text(),
  pointsToImprove: text(),
  /** Legacy shape: a comma-separated slug list. Still accepted so a client that
   *  has not reloaded across the deploy keeps working. */
  tips: text(),
  /** Current shape: the selected tip slugs. */
  tipIds: z
    .unknown()
    .transform((v) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []))
    .pipe(z.array(z.string().trim().max(120)).max(MAX_TIP_SELECTION)),
  /** Free text the teacher added alongside the selection. */
  tipsCustom: text(),
  recommendations: text(),
  screeningType: text().transform((v) => v || null),
  parentEmail: text().transform((v) => v || null),
  screeningDate: text().transform((v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "")),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromSession();
  if (!user) {
    if (process.env.NODE_ENV === "development") {
      console.log("[complete] No session - returning 401");
    }
    return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
  }
  if (user.role !== "teacher") {
    if (process.env.NODE_ENV === "development") {
      console.log("[complete] User role is", user.role, "- returning 403");
    }
    return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  }
  const { id: lessonId } = await params;
  if (process.env.NODE_ENV === "development") {
    console.log("[complete] user.id=", user.id, "role=", user.role, "lessonId=", lessonId);
  }
  try {
    const body = await req.json().catch(() => null);
    const parsed = ReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: `כל שדה מוגבל ל-${MAX_FIELD_LENGTH} תווים` },
        { status: 400 }
      );
    }
    const {
      summaryText,
      homeworkText,
      pointsToKeep,
      pointsToImprove,
      tips,
      tipIds,
      tipsCustom,
      recommendations,
      screeningType,
      parentEmail: parentEmailFromBody,
      screeningDate: screeningDateStr,
    } = parsed.data;
    const screeningDate = screeningDateStr
      ? new Date(screeningDateStr + "T12:00:00")
      : null;
    // Which fields are required, and what they are called, is admin-configurable.
    // The server stays the authority; the form's asterisks are only a hint.
    const values: Record<string, string> = {
      summaryText,
      pointsToKeep,
      pointsToImprove,
      recommendations,
      homeworkText,
      tips,
    };
    const fields = await getReportFields();
    const missing = fields
      .filter((f) => f.isRequired && !values[f.key]?.trim())
      .map((f) => f.label);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `נא למלא את השדות החובה: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: user.id },
      include: { teacher: true, student: { include: { studentProfile: true } } },
    });
    if (!lesson) {
      return NextResponse.json({ error: "השיעור לא נמצא או שאין לך הרשאה" }, { status: 404 });
    }
    if (lesson.status !== "scheduled") {
      if (lesson.status === "completed") {
        return NextResponse.json({ error: "הדוח כבר נשלח. השיעור הושלם." }, { status: 409 });
      }
      return NextResponse.json(
        { error: "השיעור לא אושר" },
        { status: 403 }
      );
    }

    const dateStr = formatDateInIsrael(lesson.date);
    if (!isLessonStarted(dateStr, lesson.startTime)) {
      return NextResponse.json(
        { error: "אפשר למלא דוח רק אחרי תחילת השיעור" },
        { status: 403 }
      );
    }

    const teacherName = lesson.teacher.name || lesson.teacher.email;
    const studentName = lesson.student.name || lesson.student.email;

    // The selection may arrive either way while clients are mid-deploy.
    const selectedSlugs = tipIds.length > 0 ? tipIds : parseStoredSlugs(tips);
    // Resolved here, never taken from the client: the snapshot is what a parent
    // reads, and it must not be arbitrary text a request supplied. Freezing it now
    // is what stops a later edit to a tip from rewriting this report.
    const tipsSnapshot = await buildTipsSnapshot(selectedSlugs, tipsCustom);

    await prisma.$transaction([
      prisma.lessonSummary.create({
        data: {
          lessonId: lesson.id,
          summaryText: summaryText || "",
          homeworkText: homeworkText || "",
          pointsToKeep: pointsToKeep || "",
          pointsToImprove: pointsToImprove || "",
          tips: selectedSlugs.join(","),
          tipsCustom: tipsCustom || "",
          tipsSnapshot,
          recommendations: recommendations || "",
          pdfUrl: null,
        },
      }),
      prisma.lesson.update({
        where: { id: lesson.id },
        data: { status: "completed", reportCompleted: true },
      }),
    ]);

    if (screeningType !== null || screeningDate !== null || (parentEmailFromBody && isValidEmail(parentEmailFromBody))) {
      const createData: { userId: string; currentScreeningType?: string; currentScreeningDate?: Date; parentEmail?: string } = {
        userId: lesson.studentId,
      };
      if (screeningType !== null) createData.currentScreeningType = screeningType;
      if (screeningDate !== null) createData.currentScreeningDate = screeningDate;
      if (parentEmailFromBody && isValidEmail(parentEmailFromBody)) createData.parentEmail = parentEmailFromBody;

      const updateData: { currentScreeningType?: string; currentScreeningDate?: Date; parentEmail?: string | null } = {};
      if (screeningType !== null) updateData.currentScreeningType = screeningType;
      if (screeningDate !== null) updateData.currentScreeningDate = screeningDate;
      if (parentEmailFromBody !== undefined) {
        updateData.parentEmail = parentEmailFromBody && isValidEmail(parentEmailFromBody) ? parentEmailFromBody : null;
      }

      await prisma.studentProfile.upsert({
        where: { userId: lesson.studentId },
        create: createData,
        update: updateData,
      });
    }

    // The PDF is rendered on first view, not here. Rendering inline added seconds
    // of CPU to a request that already sends several emails, and the write it did
    // afterwards is lost anyway on an ephemeral filesystem. Both PDF routes render
    // on demand when the file is not cached.
    const pdfUrl = `/api/pdf/lesson-summaries/lesson-${lessonId}.pdf`;
    await prisma.lessonSummary.update({
      where: { lessonId },
      data: { pdfUrl },
    });

    const allAdminEmails = await resolveAdminRecipients();

    const profile = lesson.student.studentProfile as { parentEmail?: string | null } | null;
    const parentEmailFromProfile = profile?.parentEmail?.trim();
    const parentEmail = parentEmailFromBody ?? parentEmailFromProfile;
    const parentEmails = parentEmail && isValidEmail(parentEmail) && isValidDeliveryEmail(parentEmail)
      ? [parentEmail]
      : [];

    const toEmails = [
      lesson.teacher.email,
      lesson.student.email,
      ...parentEmails,
      ...allAdminEmails,
    ];
    const toEmailsDeduped = Array.from(new Set(toEmails.map((e) => e.toLowerCase())));
    console.log("[complete] notifying", toEmailsDeduped.length, "recipient(s)");

    const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    let publicPdfUrl: string | undefined;
    try {
      if (baseUrl) {
        const linkResult = await createLessonSummaryLink({
          lessonId,
          recipientEmail: lesson.student.email,
          baseUrl,
        });
        publicPdfUrl = linkResult.publicUrl;
      }
    } catch (linkErr) {
      console.error("[complete] Public PDF link creation failed (email will use fallback):", linkErr instanceof Error ? linkErr.message : linkErr);
    }

    try {
      await sendLessonCompleted({
        to: toEmailsDeduped,
        lessonId,
        studentName,
        teacherName,
        date: dateStr,
        publicPdfUrl: publicPdfUrl ?? undefined,
        pdfUrl: pdfUrl ?? undefined,
      });
    } catch (emailErr) {
      console.error("[complete] Email send failed (lesson still completed):", emailErr instanceof Error ? emailErr.message : emailErr);
    }

    return NextResponse.json({
      ok: true,
      pdfUrl,
    });
  } catch (e) {
    console.error("[complete] Failed:", e instanceof Error ? e.message : e);
    const message = process.env.NODE_ENV === "development" && e instanceof Error ? e.message : "שגיאה בשרת";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
