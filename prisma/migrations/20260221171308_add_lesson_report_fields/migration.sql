-- AlterTable
ALTER TABLE "LessonSummary" ADD COLUMN     "pointsToImprove" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "pointsToKeep" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "recommendations" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tips" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "homeworkText" SET DEFAULT '';
