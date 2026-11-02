-- Server-authoritative clocks: timestamp of the last clock-affecting event
ALTER TABLE "Game" ADD COLUMN "lastMoveAt" TIMESTAMP(3);
UPDATE "Game" SET "lastMoveAt" = COALESCE("finishedAt", "createdAt") WHERE "lastMoveAt" IS NULL;

-- Renumber moves per game so the new unique constraint cannot fail on legacy duplicates
UPDATE "Move" m
SET "moveNumber" = r.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "gameId" ORDER BY "timestamp", id) AS rn
    FROM "Move"
) r
WHERE m.id = r.id;

-- DropIndex
DROP INDEX "Move_gameId_moveNumber_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Move_gameId_moveNumber_key" ON "Move"("gameId", "moveNumber");
CREATE INDEX "User_elo_idx" ON "User"("elo");
CREATE INDEX "Game_playerWhiteId_idx" ON "Game"("playerWhiteId");
CREATE INDEX "Game_playerBlackId_idx" ON "Game"("playerBlackId");
CREATE INDEX "Game_status_idx" ON "Game"("status");
CREATE INDEX "ChatMessage_gameId_sentAt_idx" ON "ChatMessage"("gameId", "sentAt");
CREATE INDEX "RatingHistory_userId_createdAt_idx" ON "RatingHistory"("userId", "createdAt");
