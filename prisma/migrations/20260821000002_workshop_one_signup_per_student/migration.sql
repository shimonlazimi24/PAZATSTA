-- Backstop for the workshop signup race: a student can hold at most one live
-- registration per workshop. Canceled rows are excluded so a student who cancels
-- can sign up again, matching the partial index used for private lessons.

CREATE UNIQUE INDEX IF NOT EXISTS "Lesson_workshop_student_when_live"
  ON "Lesson" ("workshopId", "studentId")
  WHERE "workshopId" IS NOT NULL AND "status" != 'canceled';
