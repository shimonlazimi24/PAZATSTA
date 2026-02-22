-- No-op: these columns were already added in 20260221171308_add_lesson_report_fields.
-- This migration is kept for history; ensure columns exist only if missing.
ALTER TABLE "LessonSummary" ADD COLUMN IF NOT EXISTS "pointsToKeep" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LessonSummary" ADD COLUMN IF NOT EXISTS "pointsToImprove" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LessonSummary" ADD COLUMN IF NOT EXISTS "tips" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LessonSummary" ADD COLUMN IF NOT EXISTS "recommendations" TEXT NOT NULL DEFAULT '';
