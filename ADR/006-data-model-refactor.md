# ADR-006: 数据模型重构 - 采用直接好友与群组模型

## 状态
🟡 提议

## 上下文

当前系统使用 **Conversation**（会话）模型来封装消息，其结构为：
- `Conversation.participantIds` 保存用户 ID 数组
- 消息通过 `conversationId` 关联

这带来以下问题：
1. **无法区分一对一与群聊**：两者混用同一表，查询逻辑复杂
2. **好友关系与消息耦合**：添加好友需创建会话，扩展性差
3. **管理功能受限**：管理员无法直接查看用户的 API Key（若需明文，必须存储）
4. **移动端适配困难**：会话模型不适合轻量级好友聊天和群组

用户明确要求新结构：

- 用户：id, apiKey, nickname, name, email?, avatar?, isAdmin, status, timestamps
- 好友关系：id, userId, friendId, status, timestamps
- 消息：id, senderId, receiverId, content, sentAt, readAt?
- 群组：id, name, description?, creatorId, timestamps
- 群组成员：id, groupId, userId, role, joinedAt
- 群组消息：id, groupId, senderId, content, sentAt

同时要求：
- 管理员可明文查看用户 API Key
- 支持移动端
- 管理员“上帝模式”（全权限）

## 决策

采用 **直接好友关系 + 群组** 的数据模型，重构数据库 schema。

### 新表结构（Prisma）

```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  apiKey       String?  // 明文, 仅管理员可见
  apiKeyHash   String   @unique
  nickname     String?
  name         String?  // displayName
  email        String?  @unique
  avatarUrl    String?
  isAdmin      Boolean  @default(false)
  status       String   @default("active")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  sentMessages     Message[]               @relation("SentMessages")
  receivedFriendships Friendship[]         @relation("ReceivedFriendships")
  friendOf         Friendship[]            @relation("FriendshipFriends")
  ownedGroups      Group[]                 @relation("GroupOwner")
  groupMemberships GroupMember[]
  groupMessages    GroupMessage[]          @relation("GroupMessageSender")
  // ...其他关系
}

model Friendship {
  id        String   @id @default(cuid())
  userId    String   // 关注者
  friendId  String   // 被关注者
  status    String   @default("pending") // pending|accepted|blocked
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user              User   @relation("ReceivedFriendships", fields: [userId], references: [id])
  friend            User   @relation("FriendshipFriends", fields: [friendId], references: [id])

  @@unique([userId, friendId])
  @@index([userId])
  @@index([friendId])
  @@index([status])
}

model Message {
  id        String   @id @default(cuid())
  senderId  String
  receiverId String?
  content   String
  sentAt    DateTime @default(now())
  readAt    DateTime?

  sender     User  @relation("SentMessages", fields: [senderId], references: [id])
  receiver   User? @relation("ReceivedMessages", fields: [receiverId], references: [id])
}

model Group {
  id          String  @id @default(cuid())
  name        String
  description String?
  creatorId   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  creator       User            @relation("GroupOwner", fields: [creatorId], references: [id])
  members       GroupMember[]
  messages      GroupMessage[]
}

model GroupMember {
  id        String   @id @default(cuid())
  groupId   String
  userId    String
  role      String   @default("member") // admin|member
  joinedAt  DateTime @default(now())

  group     Group   @relation(fields: [groupId], references: [id])
  user      User    @relation(fields: [userId], references: [id])

  @@unique([groupId, userId])
}

model GroupMessage {
  id        String   @id @default(cuid())
  groupId   String
  senderId  String
  content   String
  sentAt    DateTime @default(now())

  group     Group    @relation(fields: [groupId], references: [id])
  sender    User     @relation("GroupMessageSender", fields: [senderId], references: [id])

  @@index([groupId])
  @@index([sentAt])
}
```

### API 变更

- 保留现有认证、管理员统计/日志、用户管理（扩展示 API Key）
- 新增或重构以下端点：
  - `GET    /api/v1/friends` – 好友列表（可 filter status）
  - `POST   /api/v1/friends` – 添加好友（申请）
  - `PUT    /api/v1/friends/:id` – 修改好友状态（接受/拒绝/拉黑）
  - `DELETE /api/v1/friends/:id` – 删除好友
  - `GET    /api/v1/messages?receiverId=` – 获取与某好友的会话消息（分页）
  - `POST   /api/v1/messages` – 发送消息 `{ receiverId, content }`
  - `POST   /api/v1/groups` – 创建群组
  - `GET    /api/v1/groups?userId=` – 查询用户所在群组
  - `POST   /api/v1/groups/:groupId/members` – 邀请/添加成员
  - `DELETE /api/v1/groups/:groupId/members/:userId` – 移除成员
  - `GET    /api/v1/groups/:groupId/messages` – 群消息列表
  - `POST   /api/v1/groups/:groupId/messages` – 发送群消息

### API 文档与测试

- 所有新增/修改的端点需补充单元测试与集成测试（覆盖率 100%）
- 更新 `Wiki API.md`，标注新版本 v2
- 使用 OpenAPI/Swagger 格式（或 Markdown）描述

## 理由

1. **关系清晰**：一对一好友与群组分离，避免歧义
2. **查询高效**：消息直接关联 sender/receiver，无需通过会话中转
3. **便于扩展**：群组成员、角色、权限更灵活
4. **移动端友好**：数据结构轻量，易于分页和缓存
5. **管理员视图**：User 表直接暴露 apiKey（明文），便于查看/重置

## 影响与迁移

### 数据迁移

1. 新表 `Friendship`、`Message`、`Group*` 均为空初始
2. 现有 `Conversation` 表中的消息异步迁移至 `Message`：
   - 若会话只有 2 人，创建双向 `Friendship` 并复制消息
   - 若会话 >2 人，创建 `Group` 与 `GroupMember`，复制消息至 `GroupMessage`
3. 迁移脚本工具化，可在维护窗口执行

### 向后兼容

- 旧版 `Conversation`、`MessageRead` 表暂时保留（标记 deprecated），API 保持工作至 v2 正式发布
- 前端可逐步迁移到新接口，旧版接口返回 `warning` 头提示

### 部署策略

- 分阶段上线：
  1. 部署新 schema + 迁移脚本（仅新增表，不影响现有数据）
  2. 部署新旧兼容的双写 API（同时写入 Conversation 和 Message）
  3. 验证无误后，切换前端到新 API
  4. 逐步淘汰旧表与旧接口

## 替代方案

- **使用 JSONB 扩展 Conversation**：放弃，复杂度高，不利于跨平台查询
- **保留 Conversation 不变，仅添加 Group**：不一致，仍存在好友管理耦合

## 未定问题

- [ ] 是否需要在首次启动时自动执行迁移，还是提供手动脚本？
- [ ] 旧用户数据迁移的批次大小与回滚方案
- [ ] 管理员查看 API Key 是否需额外审计日志（建议：是）

## 参考文献

- 用户需求：支持移动端、管理员上帝模式、明文 API Key 查看
- 现有 ADR-002（Prisma）、ADR-003（API Key 认证）

---

*创建于: 2026-04-18*