-- Additive only: new tables for group lessons. No existing table changes.

CREATE TABLE "GroupLessonType" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupLessonType_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GroupLessonType_category_name_key" ON "GroupLessonType"("category", "name");

CREATE TABLE "GroupLesson" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "details" TEXT,
    "teachersNeeded" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GroupLesson_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "GroupLesson_date_idx" ON "GroupLesson"("date");
CREATE INDEX "GroupLesson_status_date_idx" ON "GroupLesson"("status", "date");
ALTER TABLE "GroupLesson" ADD CONSTRAINT "GroupLesson_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "GroupLessonType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "GroupLessonSignup" (
    "id" TEXT NOT NULL,
    "groupLessonId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminderSentAt" TIMESTAMP(3),
    CONSTRAINT "GroupLessonSignup_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GroupLessonSignup_groupLessonId_teacherId_key" ON "GroupLessonSignup"("groupLessonId", "teacherId");
CREATE INDEX "GroupLessonSignup_teacherId_idx" ON "GroupLessonSignup"("teacherId");
ALTER TABLE "GroupLessonSignup" ADD CONSTRAINT "GroupLessonSignup_groupLessonId_fkey" FOREIGN KEY ("groupLessonId") REFERENCES "GroupLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GroupLessonReport" (
    "id" TEXT NOT NULL,
    "groupLessonId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "typeLabel" TEXT NOT NULL,
    "participants" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupLessonReport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GroupLessonReport_groupLessonId_teacherId_key" ON "GroupLessonReport"("groupLessonId", "teacherId");
ALTER TABLE "GroupLessonReport" ADD CONSTRAINT "GroupLessonReport_groupLessonId_fkey" FOREIGN KEY ("groupLessonId") REFERENCES "GroupLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "GroupLessonNotice" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupLessonNotice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GroupLessonNotice_monthKey_kind_key" ON "GroupLessonNotice"("monthKey", "kind");

-- Starting types. The admin adds and renames them from the admin screen.
INSERT INTO "GroupLessonType" ("id", "category", "name", "sortOrder") VALUES
  ('glt_yom_hamea_stations', 'יום המאה', 'תחנות קבוצתיות', 1),
  ('glt_yom_hamea_psycho',   'יום המאה', 'מבחנים פסיכוטכניים', 2),
  ('glt_tzav_dapar',         'צו ראשון', 'מבחן דפ״ר', 1),
  ('glt_tzav_interview',     'צו ראשון', 'ראיון אישי', 2);
