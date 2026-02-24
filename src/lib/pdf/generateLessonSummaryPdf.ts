import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { createLessonSummaryDocument } from "./LessonSummaryPDF";

const STORAGE_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), "storage", "pdfs");
const SUBDIR = "lesson-summaries";

export type PdfErrorCode = "LESSON_NOT_FOUND" | "SUMMARY_MISSING" | "RENDER_FAILED" | "DB_FAILED";

export type GeneratePdfResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; code: PdfErrorCode; details?: string };

function safeFilename(lessonId: string): string {
  const sanitized = lessonId.replace(/[^a-zA-Z0-9-_]/g, "");
  if (!sanitized) throw new Error("Invalid lessonId");
  return `lesson-${sanitized}.pdf`;
}

function safeDateStr(date: unknown): string {
  const dateObj = date instanceof Date ? date : new Date(date as string | number);
  if (isNaN(dateObj.getTime())) return String(date ?? "—");
  return dateObj.toISOString().slice(0, 10);
}

/**
 * Generate PDF buffer for a lesson summary (no storage).
 * Returns typed result - never swallows errors; throws only for unexpected failures.
 */
export async function generateLessonPdfBuffer(
  lessonId: string
): Promise<GeneratePdfResult> {
  console.log("[pdf] generateLessonPdfBuffer start, lessonId:", lessonId);

  let lesson;
  try {
    lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        teacher: { select: { name: true, email: true } },
        student: { select: { name: true, email: true } },
        summary: true,
      },
    });
  } catch (e) {
    console.error("[pdf] DB query failed for lessonId:", lessonId, e);
    console.error("[pdf] DB error stack:", e instanceof Error ? e.stack : "no stack");
    return { ok: false, code: "DB_FAILED", details: e instanceof Error ? e.message : "Database error" };
  }

  if (!lesson) {
    console.log("[pdf] lesson not found, lessonId:", lessonId);
    return { ok: false, code: "LESSON_NOT_FOUND" };
  }

  console.log("[pdf] lesson exists, lesson.date type:", typeof lesson.date, "value:", lesson.date);

  if (!lesson.summary) {
    console.log("[pdf] lesson has no summary, lessonId:", lessonId);
    return { ok: false, code: "SUMMARY_MISSING" };
  }

  const summary = lesson.summary;
  const studentName = lesson.student.name || lesson.student.email;
  const teacherName = lesson.teacher.name || lesson.teacher.email;
  const dateStr = safeDateStr(lesson.date);
  const timeRange = `${lesson.startTime}–${lesson.endTime}`;

  try {
    const doc = createLessonSummaryDocument({
      studentName,
      teacherName,
      studentEmail: lesson.student.email || undefined,
      teacherEmail: lesson.teacher.email || undefined,
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
    const buf = Buffer.from(buffer);
    const header = buf.slice(0, 4).toString("utf8");
    if (header !== "%PDF") {
      console.error("[pdf] invalid PDF header, got:", JSON.stringify(header), "lessonId:", lessonId);
      return { ok: false, code: "RENDER_FAILED", details: "Invalid PDF output" };
    }
    console.log("[pdf] generateLessonPdfBuffer success, lessonId:", lessonId, "buffer length:", buf.length);
    return { ok: true, buffer: buf };
  } catch (e) {
    console.error("[pdf] renderToBuffer failed for lessonId:", lessonId, e);
    console.error("[pdf] render error stack:", e instanceof Error ? e.stack : "no stack");
    return {
      ok: false,
      code: "RENDER_FAILED",
      details: e instanceof Error ? e.message : "PDF render failed",
    };
  }
}

/**
 * Generate PDF for a lesson summary and store it.
 * Updates lesson.summary.pdfUrl in DB.
 */
export async function generateAndStoreLessonPdf(
  lessonId: string
): Promise<{ pdfUrl?: string; pdfBuffer?: Buffer }> {
  const result = await generateLessonPdfBuffer(lessonId);
  if (!result.ok) {
    console.warn("[pdf] generateAndStoreLessonPdf: generateLessonPdfBuffer failed, code:", result.code);
    return {};
  }
  const buffer = result.buffer;

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
    return { pdfBuffer: Buffer.from(buffer) };
  }
}
