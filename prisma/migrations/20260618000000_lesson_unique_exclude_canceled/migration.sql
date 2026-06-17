-- The partial unique index on Lesson blocked re-booking a slot after the previous
-- lesson was canceled, because canceled lessons were still covered by the constraint.
-- Fix: recreate the index to also exclude canceled rows.
DROP INDEX IF EXISTS "Lesson_teacher_date_start_when_no_workshop";

CREATE UNIQUE INDEX "Lesson_teacher_date_start_when_no_workshop"
  ON "Lesson" ("teacherId", "date", "startTime")
  WHERE "workshopId" IS NULL AND "status" != 'canceled';
