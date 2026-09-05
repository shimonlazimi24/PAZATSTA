-- Session identifiers used to be the row's cuid, which encodes a timestamp and a
-- counter and is therefore not a secret. New sessions carry a random 32-byte token.
--
-- Existing sessions are preserved. The cookie a logged-in user already holds
-- contains the signed row id, so backfilling token = id keeps every current
-- session valid: the lookup by token still finds the same row. Only sessions
-- created from here on get random tokens, and the old ones age out naturally
-- within the 14-day TTL.

ALTER TABLE "Session" ADD COLUMN "token" TEXT;

UPDATE "Session" SET "token" = "id" WHERE "token" IS NULL;

ALTER TABLE "Session" ALTER COLUMN "token" SET NOT NULL;

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
