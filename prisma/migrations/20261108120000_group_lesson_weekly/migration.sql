-- Fixed weekly group lessons (e.g. every Sunday and Tuesday). Additive only.
CREATE TABLE "GroupLessonSchedule" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT,
    "teachersNeeded" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupLessonSchedule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GroupLesson" ADD COLUMN "scheduleId" TEXT;
CREATE UNIQUE INDEX "GroupLesson_scheduleId_date_key" ON "GroupLesson"("scheduleId", "date");
ALTER TABLE "GroupLesson" ADD CONSTRAINT "GroupLesson_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "GroupLessonSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Lessons made from a weekly slot start with this topic until the admin picks one.
-- Hidden (inactive), so it is never offered when creating a lesson by hand.
INSERT INTO "GroupLessonType" ("id", "category", "name", "sortOrder", "active")
VALUES ('glt_topic_pending', 'שיעור קבוצתי', 'הנושא יפורסם בקרוב', 999, false)
ON CONFLICT ("category", "name") DO NOTHING;
