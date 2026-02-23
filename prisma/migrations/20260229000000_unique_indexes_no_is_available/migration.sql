-- Prevent double-booking: unique (teacherId, date, startTime) on Lesson and Availability
-- Add indexes for teacher/student by date queries
-- Remove isAvailable from Availability (we delete slot on book, so flag redundant)

-- Availability: drop isAvailable, add unique + index
ALTER TABLE "Availability" DROP COLUMN IF EXISTS "isAvailable";

CREATE UNIQUE INDEX IF NOT EXISTS "Availability_teacherId_date_startTime_key"
  ON "Availability"("teacherId", "date", "startTime");

CREATE INDEX IF NOT EXISTS "Availability_teacherId_date_idx"
  ON "Availability"("teacherId", "date");

-- Lesson: add unique + indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Lesson_teacherId_date_startTime_key"
  ON "Lesson"("teacherId", "date", "startTime");

CREATE INDEX IF NOT EXISTS "Lesson_teacherId_date_idx"
  ON "Lesson"("teacherId", "date");

CREATE INDEX IF NOT EXISTS "Lesson_studentId_date_idx"
  ON "Lesson"("studentId", "date");
