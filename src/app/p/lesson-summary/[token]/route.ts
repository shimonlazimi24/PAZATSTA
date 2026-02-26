import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/publicPdfLink";
import { generateLessonPdfBuffer } from "@/lib/pdf/generateLessonSummaryPdf";

export const runtime = "nodejs";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage", "pdfs");
const SUBDIR = "lesson-summaries";

function errorPageHtml(title: string, message: string): string {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body { font-family: Heebo, sans-serif; padding: 2rem; max-width: 480px; margin: 0 auto; text-align: center; }
    h1 { font-size: 1.25rem; color: #333; }
    p { color: #666; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${message}</p>
</body>
</html>`;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const rawToken = decodeURIComponent(token || "").trim();
  if (!rawToken) {
    return new NextResponse(
      errorPageHtml("קישור לא תקין", "הקישור חסר או פגום. נא לבדוק את הקישור או לבקש קישור חדש."),
      { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const tokenHash = hashToken(rawToken);
  const link = await prisma.publicPdfLink.findUnique({
    where: { tokenHash },
  });

  if (!link || link.isRevoked) {
    return new NextResponse(
      errorPageHtml("קישור לא זמין", "הקישור בוטל או אינו תקף. נא לפנות למורה או לאדמין לקבלת קישור חדש."),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const lessonId = link.lessonId;
  if (!lessonId) {
    return new NextResponse(
      errorPageHtml("שגיאה", "לא נמצא מידע על השיעור."),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  await prisma.publicPdfLink.update({
    where: { id: link.id },
    data: {
      accessCount: { increment: 1 },
      lastAccessedAt: new Date(),
    },
  });

  const filename = `lesson-${lessonId.replace(/[^a-zA-Z0-9-_]/g, "")}.pdf`;
  const relativePath = path.join(SUBDIR, filename);
  const fullPath = path.join(STORAGE_DIR, relativePath);

  let buffer: Buffer;
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    buffer = fs.readFileSync(fullPath);
  } else {
    const result = await generateLessonPdfBuffer(lessonId);
    if (!result.ok) {
      return new NextResponse(
        errorPageHtml("שגיאה", "לא ניתן לטעון את הדוח כרגע. נא לנסות שוב מאוחר יותר."),
        { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }
    buffer = result.buffer;
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { date: true },
  });
  const dateStr = lesson?.date ? lesson.date.toISOString().slice(0, 10) : "summary";
  const dispositionFilename = `pazatsta-lesson-summary-${dateStr}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${dispositionFilename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
