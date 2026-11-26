-- What each teacher takes part in (private lessons, group lessons, frontal days).
-- Additive; every existing teacher keeps all three.
ALTER TABLE "TeacherProfile" ADD COLUMN "canPrivate" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TeacherProfile" ADD COLUMN "canGroup" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "TeacherProfile" ADD COLUMN "canFrontal" BOOLEAN NOT NULL DEFAULT true;
