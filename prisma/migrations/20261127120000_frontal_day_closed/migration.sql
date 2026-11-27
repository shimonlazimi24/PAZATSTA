-- The admin closes a past frontal day: it stops asking for attention and moves to the archive. Additive only.
ALTER TABLE "FrontalDay" ADD COLUMN "closedAt" TIMESTAMP(3);
