-- CreateTable
CREATE TABLE "PublicPdfLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "lessonId" TEXT,
    "pdfId" TEXT,
    "recipientEmail" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PublicPdfLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicPdfLink_tokenHash_key" ON "PublicPdfLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PublicPdfLink_tokenHash_idx" ON "PublicPdfLink"("tokenHash");

-- CreateIndex
CREATE INDEX "PublicPdfLink_lessonId_recipientEmail_idx" ON "PublicPdfLink"("lessonId", "recipientEmail");
