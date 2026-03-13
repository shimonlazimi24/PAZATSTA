import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { generateAndStoreLessonPdf } from "@/lib/pdf/generateLessonSummaryPdf";
import { sendLessonCompleted } from "@/lib/email";
import { createLessonSummaryLink } from "@/lib/publicPdfLink";
import { isLessonEnded } from "@/lib/dates";
import { formatDateInIsrael } from "@/lib/date-utils";
import { isValidEmail, isValidDeliveryEmail } from "@/lib/validation";
import { ADMIN_NOTIFICATION_EMAILS } from "@/lib/admin";

export const runtime = "nodejs";

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
    const body = await req.json();
    const summaryText = typeof body.summaryText === "string" ? body.summaryText.trim() : "";
    const homeworkText = typeof body.homeworkText === "string" ? body.homeworkText.trim() : "";
    const pointsToKeep = typeof body.pointsToKeep === "string" ? body.pointsToKeep.trim() : "";
    const pointsToImprove = typeof body.pointsToImprove === "string" ? body.pointsToImprove.trim() : "";
    const tips = typeof body.tips === "string" ? body.tips.trim() : "";
    const recommendations = typeof body.recommendations === "string" ? body.recommendations.trim() : "";
    const screeningType = typeof body.screeningType === "string" ? body.screeningType.trim() || null : null;
    const parentEmailFromBody = typeof body.parentEmail === "string" ? body.parentEmail.trim() || null : null;
    const screeningDateStr = typeof body.screeningDate === "string" ? body.screeningDate.trim() : "";
    const screeningDate = screeningDateStr && /^\d{4}-\d{2}-\d{2}$/.test(screeningDateStr)
      ? new Date(screeningDateStr + "T12:00:00")
      : null;
    const missing: string[] = [];
    if (!summaryText) missing.push("סיכום כללי");
    if (!pointsToKeep) missing.push("נקודות לשימור");
    if (!pointsToImprove) missing.push("נקודות לשיפור");
    if (!recommendations) missing.push("המלצות להמשך");
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
    if (!isLessonEnded(dateStr, lesson.endTime)) {
      return NextResponse.json(
        { error: "אפשר למלא דוח רק אחרי השיעור" },
        { status: 403 }
      );
    }

    const teacherName = lesson.teacher.name || lesson.teacher.email;
    const studentName = lesson.student.name || lesson.student.email;

    await prisma.$transaction([
      prisma.lessonSummary.create({
        data: {
          lessonId: lesson.id,
          summaryText: summaryText || "",
          homeworkText: homeworkText || "",
          pointsToKeep: pointsToKeep || "",
          pointsToImprove: pointsToImprove || "",
          tips: tips || "",
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

    const fallbackPdfUrl = `/api/pdf/lesson-summaries/lesson-${lessonId}.pdf`;
    let pdfUrl: string | null = null;
    try {
      const pdfResult = await generateAndStoreLessonPdf(lessonId);
      pdfUrl = pdfResult.pdfUrl ?? fallbackPdfUrl;
      if (pdfResult.pdfUrl) {
        console.log("[complete] PDF stored, pdfUrl:", pdfResult.pdfUrl);
      } else {
        console.log("[complete] PDF storage failed, using on-demand URL:", pdfUrl);
      }
    } catch (pdfErr) {
      console.error("[complete] PDF generation failed (lesson still completed):", pdfErr instanceof Error ? pdfErr.message : pdfErr);
      pdfUrl = fallbackPdfUrl;
    }

    // Always persist pdfUrl so the UI shows "צפייה ב-PDF" for completed reports
    if (pdfUrl) {
      await prisma.lessonSummary.update({
        where: { lessonId },
        data: { pdfUrl },
      });
    }

    const adminUsers = await prisma.user.findMany({
      where: { role: "admin" },
      select: { email: true },
    });
    const adminEmailsSet = new Set<string>();
    for (const a of adminUsers) if (a.email && isValidDeliveryEmail(a.email)) adminEmailsSet.add(a.email.toLowerCase());
    for (const e of ADMIN_NOTIFICATION_EMAILS) if (isValidDeliveryEmail(e)) adminEmailsSet.add(e.toLowerCase());
    // Runtime fallback: env may not be loaded at module init in serverless
    const envAdmin = process.env.ADMIN_NOTIFICATION_EMAILS ?? "";
    const envAdminList = envAdmin ? envAdmin.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) : [];
    for (const e of envAdminList) if (isValidDeliveryEmail(e)) adminEmailsSet.add(e);
    if (adminEmailsSet.size === 0) {
      for (const e of ["shachar.cygler@gmail.com", "admin@pazatsta.co.il"]) adminEmailsSet.add(e);
    }

    const profile = lesson.student.studentProfile as { parentEmail?: string | null } | null;
    const parentEmailFromProfile = profile?.parentEmail?.trim();
    const parentEmail = parentEmailFromBody ?? parentEmailFromProfile;
    const parentEmails = parentEmail && isValidEmail(parentEmail) && isValidDeliveryEmail(parentEmail)
      ? [parentEmail]
      : [];
    console.log("[complete] parentEmailFromBody:", parentEmailFromBody, "fromProfile:", parentEmailFromProfile, "final:", parentEmail, "included:", parentEmails.length > 0);
    const adminEmailsList = Array.from(adminEmailsSet);
    const DEFAULT_ADMIN_EMAILS = ["shachar.cygler@gmail.com", "admin@pazatsta.co.il"];
    const allAdminEmails = adminEmailsList.length > 0 ? adminEmailsList : DEFAULT_ADMIN_EMAILS;

    const toEmails = [
      lesson.teacher.email,
      lesson.student.email,
      ...parentEmails,
      ...allAdminEmails,
    ];
    const toEmailsDeduped = Array.from(new Set(toEmails.map((e) => e.toLowerCase())));
    console.log("[complete] toEmails:", toEmailsDeduped, "count:", toEmailsDeduped.length);

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
