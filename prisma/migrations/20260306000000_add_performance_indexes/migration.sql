-- Lesson: composite index for date range + status (weekly board, cron, send-hours-summary)
CREATE INDEX IF NOT EXISTS "Lesson_date_status_idx" ON "Lesson"("date", "status");

-- StudentProfile: index for follow-up cron (filters by currentScreeningDate)
CREATE INDEX IF NOT EXISTS "StudentProfile_currentScreeningDate_idx" ON "StudentProfile"("currentScreeningDate");

-- Invite: indexes for lookups by email and expiresAt
CREATE INDEX IF NOT EXISTS "Invite_email_idx" ON "Invite"("email");
CREATE INDEX IF NOT EXISTS "Invite_expiresAt_idx" ON "Invite"("expiresAt");

-- TeacherProfile: GIN index for specialties array containment (specialties @> ARRAY[topic])
CREATE INDEX IF NOT EXISTS "TeacherProfile_specialties_gin_idx" ON "TeacherProfile" USING GIN ("specialties");
