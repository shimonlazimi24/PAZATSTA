-- Lesson slot uniqueness was added in 20260229 as CREATE UNIQUE INDEX "Lesson_teacherId_date_startTime_key".
-- 20260404 tried ALTER TABLE ... DROP CONSTRAINT on that name; unique INDEX is not dropped that way,
-- so the full unique index stayed and blocked multiple workshop rows for the same teacher/date/startTime.
DROP INDEX IF EXISTS "Lesson_teacherId_date_startTime_key";

-- Partial unique (non-workshop lessons only) was added in 20260404; ensure it exists if deploy was partial.
CREATE UNIQUE INDEX IF NOT EXISTS "Lesson_teacher_date_start_when_no_workshop"
  ON "Lesson" ("teacherId", "date", "startTime")
  WHERE "workshopId" IS NULL;
