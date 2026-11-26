-- Admin can hide built-in summary fields and add questions of their own. Additive only.
ALTER TABLE "ReportFieldConfig" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ReportFieldConfig" ADD COLUMN "custom" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ReportFieldConfig" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LessonSummary" ADD COLUMN "extraAnswers" JSONB;
