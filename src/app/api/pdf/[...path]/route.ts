import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { generateLessonPdfBuffer } from "@/lib/pdf/generateLessonSummaryPdf";

export const runtime = "nodejs";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage", "pdfs");

/** Match lesson-summaries/lesson-<lessonId>.pdf */
function parseLessonIdFromPath(filePath: string): string | null {
  const match = filePath.match(/^lesson-summaries\/lesson-(.+)\.pdf$/);
  if (!match) return null;
  const id = match[1];
  if (!id || id.length < 10) return null;
  return id;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await params;
  const filename = pathSegments.join("/");
  if (!filename || filename.includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const fullPath = path.join(STORAGE_DIR, filename);
  const dispositionFilename = path.basename(filename);
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    const buffer = fs.readFileSync(fullPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${dispositionFilename}"`,
      },
    });
  }

  const lessonId = parseLessonIdFromPath(filename);
  if (lessonId) {
    const buffer = await generateLessonPdfBuffer(lessonId);
    if (buffer) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${dispositionFilename}"`,
        },
      });
    }
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
