-- Session identifiers used to be the row's cuid, which encodes a timestamp and a
-- counter and is therefore not a secret. Sessions now carry a random 32-byte token.
--
-- Existing rows have no token and cannot be migrated (the old cookie value was the
-- id). Clearing the table forces everyone to log in again, which is the correct
-- response to rotating session identifiers anyway.

DELETE FROM "Session";

ALTER TABLE "Session" ADD COLUMN "token" TEXT NOT NULL;

CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
