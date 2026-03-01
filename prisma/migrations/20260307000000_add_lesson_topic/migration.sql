-- Add topic to Lesson (סוג מיון from booking)
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "topic" TEXT;
