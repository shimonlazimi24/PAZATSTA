import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createLessonSummaryDocument } from "./LessonSummaryPDF";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage", "pdfs");
const SUBDIR = "lesson-summaries";

function safeFilename(lessonId: string): string {
  // Ensure no path traversal; only alphanumeric and hyphens
  const sanitized = lessonId.replace(/[^a-zA-Z0-9-_]/g, "");
  if (!sanitized) throw new Error("Invalid lessonId");
  return `lesson-${sanitized}.pdf`;
}

/**
 * Generate PDF buffer for a lesson summary (no storage).
 * Used when serving PDF on-demand (e.g. serverless where disk doesn't persist).
 */
export async function generateLessonPdfBuffer(
  lessonId: string
): Promise<Buffer | null> {
  try {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        teacher: { select: { name: true, email: true } },
        student: { select: { name: true, email: true } },
        summary: true,
      },
    });
    if (!lesson?.summary) return null;
    const summary = lesson.summary;
    const studentName = lesson.student.name || lesson.student.email;
    const teacherName = lesson.teacher.name || lesson.teacher.email;
    const dateStr = lesson.date.toISOString().slice(0, 10);
    const timeRange = `${lesson.startTime}–${lesson.endTime}`;
    const doc = createLessonSummaryDocument({
      studentName,
      teacherName,
      date: dateStr,
      timeRange,
      summaryText: summary.summaryText || "—",
      homeworkText: summary.homeworkText || "—",
      pointsToKeep: summary.pointsToKeep || "",
      pointsToImprove: summary.pointsToImprove || "",
      tips: summary.tips || "",
      recommendations: summary.recommendations || "",
    });
    const buffer = await renderToBuffer(doc);
    return Buffer.from(buffer);
  } catch (e) {
    console.error("[pdf] generateLessonPdfBuffer failed for", lessonId, e);
    return null;
  }
}

/**
 * Generate PDF for a lesson summary and store it.
 * Updates lesson.summary.pdfUrl in DB.
 * @returns { pdfUrl, pdfBuffer } if successful, {} if failed (errors logged)
 */
export async function generateAndStoreLessonPdf(
  lessonId: string
): Promise<{ pdfUrl?: string; pdfBuffer?: Buffer }> {
  let buffer: Buffer | null = null;
  try {
    buffer = await generateLessonPdfBuffer(lessonId);
    if (!buffer) return {};
  } catch (e) {
    console.error("[pdf] generateLessonPdfBuffer failed for", lessonId, e);
    return {};
  }

  try {
    const filename = safeFilename(lessonId);
    const relativePath = path.join(SUBDIR, filename);
    const fullPath = path.join(STORAGE_DIR, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);
    const pdfUrl = `/api/pdf/${SUBDIR}/${filename}`;
    await prisma.lessonSummary.update({
      where: { lessonId },
      data: { pdfUrl },
    });
    return { pdfUrl, pdfBuffer: Buffer.from(buffer) };
  } catch (e) {
    console.error("[pdf] storage failed for", lessonId, e);
    // Still return buffer so email can attach it (storage may be ephemeral on serverless)
    return { pdfBuffer: Buffer.from(buffer!) };
  }
}
