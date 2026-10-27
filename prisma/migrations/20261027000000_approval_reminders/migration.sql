-- Additive only: one nullable column and one new table. No existing data changes.

ALTER TABLE "Lesson" ADD COLUMN "canceledAt" TIMESTAMP(3);

CREATE TABLE "ApprovalReminder" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "mark" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalReminder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApprovalReminder_lessonId_mark_channel_key" ON "ApprovalReminder"("lessonId", "mark", "channel");
CREATE INDEX "ApprovalReminder_teacherId_sentAt_idx" ON "ApprovalReminder"("teacherId", "sentAt");
CREATE INDEX "ApprovalReminder_sentAt_idx" ON "ApprovalReminder"("sentAt");

ALTER TABLE "ApprovalReminder" ADD CONSTRAINT "ApprovalReminder_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
