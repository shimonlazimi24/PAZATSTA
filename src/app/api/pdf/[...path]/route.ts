import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
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
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const buffer = fs.readFileSync(fullPath);
    return new NextResponse(buffer, { headers: pdfHeaders });
  }

  const lessonId = parseLessonIdFromPath(filename);
  console.log("[pdf] lessonId:", lessonId ?? "(none)");
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
