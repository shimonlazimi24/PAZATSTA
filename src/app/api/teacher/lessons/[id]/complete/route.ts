import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { generateAndStoreLessonPdf } from "@/lib/pdf/generateLessonSummaryPdf";
import { sendLessonCompleted } from "@/lib/email";
import { createLessonSummaryLink } from "@/lib/publicPdfLink";
import { isLessonEnded } from "@/lib/dates";
import { formatDateInIsrael } from "@/lib/date-utils";

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
    const screeningDateStr = typeof body.screeningDate === "string" ? body.screeningDate.trim() : "";
    const screeningDate = screeningDateStr && /^\d{4}-\d{2}-\d{2}$/.test(screeningDateStr)
      ? new Date(screeningDateStr + "T12:00:00")
      : null;
    const hasAny =
      summaryText || homeworkText || pointsToKeep || pointsToImprove || tips || recommendations;
    if (!hasAny) {
      return NextResponse.json(
        { error: "נא למלא לפחות שדה אחד בדוח" },
        { status: 400 }
      );
    }

    const lesson = await prisma.lesson.findFirst({
      where: { id: lessonId, teacherId: user.id },
      include: { teacher: true, student: true },
    });
    if (!lesson) {
      return NextResponse.json({ error: "השיעור לא נמצא או שאין לך הרשאה" }, { status: 404 });
    }
    if (lesson.status !== "scheduled") {
      if (lesson.status === "completed") {
        return NextResponse.json({ error: "הדוח כבר נשלח. השיעור הושלם." }, { status: 409 });
      }
      return NextResponse.json(
        { error: "לא ניתן למלא דוח — השיעור לא במצב מאושר (בוטל או ממתין לאישור)" },
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

    if (screeningType !== null || screeningDate !== null) {
      const createData: { userId: string; currentScreeningType?: string; currentScreeningDate?: Date } = {
        userId: lesson.studentId,
      };
      if (screeningType !== null) createData.currentScreeningType = screeningType;
      if (screeningDate !== null) createData.currentScreeningDate = screeningDate;

      const updateData: { currentScreeningType?: string; currentScreeningDate?: Date } = {};
      if (screeningType !== null) updateData.currentScreeningType = screeningType;
      if (screeningDate !== null) updateData.currentScreeningDate = screeningDate;

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
    const toEmails = [
      lesson.teacher.email,
      lesson.student.email,
      ...adminUsers.map((a) => a.email),
    ];

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
        to: Array.from(new Set(toEmails)),
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
