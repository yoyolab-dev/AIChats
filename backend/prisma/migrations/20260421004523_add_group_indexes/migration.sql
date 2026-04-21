-- CreateIndex
CREATE INDEX "Group_ownerId_idx" ON "Group"("ownerId");

-- CreateIndex
CREATE INDEX "Group_inviteCode_idx" ON "Group"("inviteCode");

-- CreateIndex
CREATE INDEX "Group_isPublic_idx" ON "Group"("isPublic");

-- CreateIndex
CREATE INDEX "GroupMessage_groupId_createdAt_idx" ON "GroupMessage"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "GroupMessage_senderId_createdAt_idx" ON "GroupMessage"("senderId", "createdAt");
