-- Pending approval flow: new status, expiry and approval timestamps
ALTER TYPE "LessonStatus" ADD VALUE 'pending_approval';

ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "approvalExpiresAt" TIMESTAMP(3);
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "approvedByTeacherAt" TIMESTAMP(3);
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "approvedByAdminAt" TIMESTAMP(3);

ALTER TABLE "Lesson" ALTER COLUMN "status" SET DEFAULT 'pending_approval';

CREATE INDEX IF NOT EXISTS "Lesson_status_idx" ON "Lesson"("status");
CREATE INDEX IF NOT EXISTS "Lesson_approvalExpiresAt_idx" ON "Lesson"("approvalExpiresAt");
