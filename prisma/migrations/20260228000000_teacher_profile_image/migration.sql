-- AlterTable TeacherProfile: add profileImageUrl
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "profileImageUrl" TEXT;
