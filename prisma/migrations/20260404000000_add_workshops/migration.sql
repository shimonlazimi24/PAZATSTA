-- CreateTable
CREATE TABLE "Workshop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "teacherId" TEXT NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL DEFAULT '09:00',
    "endTime" TEXT NOT NULL DEFAULT '17:00',
    "topicLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workshop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workshop_topicLabel_key" ON "Workshop"("topicLabel");

ALTER TABLE "Workshop" ADD CONSTRAINT "Workshop_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Lesson" ADD COLUMN "workshopId" TEXT;

ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "Workshop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Lesson_workshopId_idx" ON "Lesson"("workshopId");

-- Allow multiple lesson rows per teacher slot for workshops (group bookings)
ALTER TABLE "Lesson" DROP CONSTRAINT IF EXISTS "Lesson_teacherId_date_startTime_key";

CREATE UNIQUE INDEX "Lesson_teacher_date_start_when_no_workshop" ON "Lesson" ("teacherId", "date", "startTime") WHERE "workshopId" IS NULL;
