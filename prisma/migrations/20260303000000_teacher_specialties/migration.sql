-- Add specialties array for multi-select teacher specializations (matches booking topic values)
ALTER TABLE "TeacherProfile" ADD COLUMN IF NOT EXISTS "specialties" TEXT[] DEFAULT '{}';
