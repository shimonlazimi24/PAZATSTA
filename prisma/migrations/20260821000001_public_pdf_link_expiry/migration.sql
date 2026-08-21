-- Public lesson-summary links had no expiry: once emailed, a link granted permanent
-- unauthenticated access to a minor's report. Give every link a lifetime.
--
-- Backfill existing rows to 90 days after creation. Links already older than that
-- become expired immediately, which is the intended outcome.

ALTER TABLE "PublicPdfLink" ADD COLUMN "expiresAt" TIMESTAMP(3);

UPDATE "PublicPdfLink" SET "expiresAt" = "createdAt" + INTERVAL '90 days' WHERE "expiresAt" IS NULL;

ALTER TABLE "PublicPdfLink" ALTER COLUMN "expiresAt" SET NOT NULL;

CREATE INDEX "PublicPdfLink_expiresAt_idx" ON "PublicPdfLink"("expiresAt");
