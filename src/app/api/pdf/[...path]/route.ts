import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/db";
import { getUserFromSession } from "@/lib/auth";
import { canAccessAdmin } from "@/lib/admin";
import { generateLessonPdfBuffer } from "@/lib/pdf/generateLessonSummaryPdf";

export const runtime = "nodejs";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage", "pdfs");

/** Match lesson-summaries/lesson-<lessonId>.pdf - lessonId is alphanumeric, hyphens, underscores (CUID-like) */
function parseLessonIdFromPath(filePath: string): string | null {
  const match = filePath.match(/^lesson-summaries\/lesson-([a-zA-Z0-9_-]+)\.pdf$/);
  if (!match) return null;
  const id = match[1];
  if (!id || id.length < 3) return null;
  return id;
}

/** Verify user is teacher, student, or admin for this lesson. */
async function canAccessLessonPdf(userId: string, role: string, lessonId: string): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { teacherId: true, studentId: true },
  });
  if (!lesson) return false;
  if (lesson.teacherId === userId || lesson.studentId === userId) return true;
  if (role === "admin") return true;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return !!user && canAccessAdmin({ role, email: user.email });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filename = pathSegments.join("/");
  console.log("[pdf] filename:", filename);

  if (!filename || filename.includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fullPath = path.join(STORAGE_DIR, filename);
  const dispositionFilename = path.basename(filename);
  const pdfHeaders = {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${dispositionFilename}"`,
    "Cache-Control": "no-store",
  };

  const lessonId = parseLessonIdFromPath(filename);

  if (lessonId) {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "נדרשת התחברות" }, { status: 401 });
    }
    const allowed = await canAccessLessonPdf(user.id, user.role, lessonId);
    if (!allowed) {
      return NextResponse.json({ error: "אין הרשאה לצפייה בדוח זה" }, { status: 403 });
    }
  }

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const buffer = fs.readFileSync(fullPath);
    return new NextResponse(buffer, { headers: pdfHeaders });
  }

  if (lessonId) {
    const result = await generateLessonPdfBuffer(lessonId);
    if (result.ok) {
      return new NextResponse(new Uint8Array(result.buffer), { headers: pdfHeaders });
    }
    const code = result.code;
    const details = result.details ?? code;
    console.error("[pdf] generateLessonPdfBuffer failed, code:", code, "details:", details);
    return NextResponse.json(
      { error: "Failed to generate PDF", code, details },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
