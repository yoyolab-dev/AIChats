-- CreateIndex
CREATE INDEX "Friendship_userId_status_idx" ON "Friendship"("userId", "status");

-- CreateIndex
CREATE INDEX "Friendship_friendId_status_idx" ON "Friendship"("friendId", "status");
