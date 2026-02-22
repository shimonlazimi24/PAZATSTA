-- AlterTable TeacherProfile: add displayName
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "displayName" TEXT;

-- AlterTable StudentProfile: add screening and reminder fields, add profile fields; drop parentId, teacherId if present
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "studentFullName" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "parentFullName" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "parentPhone" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "currentScreeningType" TEXT;
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "currentScreeningDate" TIMESTAMP(3);
ALTER TABLE "StudentProfile" ADD COLUMN IF NOT EXISTS "followUpReminderSentAt" TIMESTAMP(3);
-- Drop old columns (ignore if not exists for fresh installs)
ALTER TABLE "StudentProfile" DROP COLUMN IF EXISTS "parentId";
ALTER TABLE "StudentProfile" DROP COLUMN IF EXISTS "teacherId";
