-- Additive only: new tables for frontal days. No existing table changes.

CREATE TABLE "FrontalDay" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT '',
    "presentationUrl" TEXT NOT NULL DEFAULT '',
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT NOT NULL DEFAULT '',
    "whatsappUrl" TEXT NOT NULL DEFAULT '',
    "feedbackUrl" TEXT NOT NULL DEFAULT '',
    "courseCode" TEXT NOT NULL DEFAULT '',
    "courseUrl" TEXT NOT NULL DEFAULT '',
    "recipientName" TEXT NOT NULL DEFAULT '',
    "recipientEmail" TEXT NOT NULL DEFAULT '',
    "teachersNeeded" INTEGER NOT NULL DEFAULT 1,
    "messageTemplate" TEXT NOT NULL DEFAULT '',
    "reminderTemplate" TEXT NOT NULL DEFAULT '',
    "checklist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'open',
    "noTeacherAlertAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FrontalDay_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FrontalDay_date_idx" ON "FrontalDay"("date");
CREATE INDEX "FrontalDay_status_date_idx" ON "FrontalDay"("status", "date");

CREATE TABLE "FrontalDaySignup" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "checklistDone" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reminderSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FrontalDaySignup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FrontalDaySignup_dayId_teacherId_key" ON "FrontalDaySignup"("dayId", "teacherId");
CREATE INDEX "FrontalDaySignup_teacherId_idx" ON "FrontalDaySignup"("teacherId");
ALTER TABLE "FrontalDaySignup" ADD CONSTRAINT "FrontalDaySignup_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "FrontalDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FrontalDayReport" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "adminNote" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "sentToRecipientAt" TIMESTAMP(3),
    CONSTRAINT "FrontalDayReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FrontalDayReport_dayId_key" ON "FrontalDayReport"("dayId");
ALTER TABLE "FrontalDayReport" ADD CONSTRAINT "FrontalDayReport_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "FrontalDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FrontalReportField" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'long',
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "FrontalReportField_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

-- Starting report fields; the admin edits them from the admin screen.
INSERT INTO "FrontalReportField" ("id", "label", "kind", "required", "sortOrder") VALUES
  ('frf_participants', 'כמה תלמידים השתתפו', 'number', true, 1),
  ('frf_summary',      'סיכום היום', 'long', true, 2),
  ('frf_highlights',   'מה עבד טוב', 'long', false, 3),
  ('frf_issues',       'בעיות או דברים לשיפור', 'long', false, 4);
