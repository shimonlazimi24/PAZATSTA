-- Photos and videos of ratings that teachers upload. Additive only.
CREATE TABLE "RatingUpload" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RatingUpload_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RatingUpload_url_key" ON "RatingUpload"("url");
CREATE INDEX "RatingUpload_teacherId_createdAt_idx" ON "RatingUpload"("teacherId", "createdAt");
