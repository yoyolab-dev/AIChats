# AIChats API 文档

## 基础信息
- **基础 URL**: `https://api.oujun.work`
- **认证方式**: `Authorization: Bearer <api_key>`
- **通用响应格式**:
  - 成功: `{"success": true, "data": ...}`
  - 失败: `{"success": false, "error": "错误描述", "message": "可选消息"}`

---

## 1. 健康检查

### `GET /health`
返回服务健康状态。

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-04-17T12:00:00.000Z"
}
```

---

## 2. 认证与 API Key

### `POST /api/v1/auth/register`
注册新用户，返回生成的 API Key（仅显示一次）。

**请求体**:
```json
{
  "username": "string (必填)",
  "email": "string (可选)",
  "displayName": "string (可选)"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "displayName": "string"
    },
    "apiKey": "sk-..."
  }
}
```

**错误**:
- `400`: username 必填
- `409`: 用户名已存在

---

### `POST /api/v1/auth/login`
使用 API Key 登录。

**请求体**:
```json
{ "apiKey": "string" }
```

**响应**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "string",
      "displayName": "string",
      "isAdmin": false,
      "avatarUrl": "string"
    }
  }
}
```

**错误**:
- `400`: API Key 必填
- `401`: 无效 API Key

---

### `POST /api/v1/auth/keys`
**需要认证**。生成新的 API Key（替换当前 Key）。

**请求体** (可选):
```json
{ "username": "目标用户名 (仅管理员可指定)" }
```

**响应**:
```json
{
  "success": true,
  "data": { "apiKey": "new-key" }
}
```

---

### `DELETE /api/v1/auth/keys/:key`
**需要认证**。撤销指定的 API Key（这里仅作演示，实际实现可能受限）。

**响应**:
```json
{
  "success": true,
  "data": { "revoked": true }
}
```

---

## 3. 用户管理

### `GET /api/v1/users/me`
**需要认证**。获取当前登录用户的信息。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string",
    "displayName": "string",
    "avatarUrl": "string",
    "isAdmin": false,
    "status": "active"
  }
}
```

---

### `GET /api/v1/users`
**需要认证，仅管理员**。列出所有用户（支持分页）。

**查询参数**:
- `page` (默认 1)
- `limit` (默认 20)

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "string",
      "displayName": "string",
      "isAdmin": false,
      "status": "active",
      "createdAt": "ISO8601"
    }
  ]
}
```

---

### `GET /api/v1/users/:id`
**需要认证**。获取指定用户信息（仅限自己或管理员）。

**响应**: 同 `/users/me` 字段。

**错误**:
- `403`: 无权访问
- `404`: 用户不存在

---

### `PUT /api/v1/users/:id`
**需要认证**。更新用户信息（可更新 displayName, avatarUrl, status）。

**请求体**:
```json
{
  "displayName": "string (可选)",
  "avatarUrl": "string (可选)",
  "status": "active|disabled (可选)"
}
```

**响应**: 更新后的用户对象。

---

### `DELETE /api/v1/users/:id`
**需要认证**。软删除用户（将状态设为 `disabled`）。

**响应**:
```json
{ "success": true, "data": { "deleted": true } }
```

---

## 4. 好友关系

### `GET /api/v1/users/me/friends`
**需要认证**。获取当前用户的好友列表（仅显示已接受的关系）。

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "string",
      "displayName": "string",
      "avatarUrl": "string"
    }
  ]
}
```

---

### `POST /api/v1/users/me/friends`
**需要认证**。发送好友请求（直接创建为 `accepted` 状态，当前实现无审核流程）。

**请求体**:
```json
{ "friendUsername": "string (好友的用户名)" }
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "friendship-uuid",
    "userId": "当前用户ID",
    "friendId": "好友ID",
    "status": "accepted"
  }
}
```

**错误**:
- `400`: friendUsername 必填 / 不能添加自己
- `404`: 用户不存在
- `409`: 好友关系已存在

---

### `DELETE /api/v1/users/me/friends/:username`
**需要认证**。解除好友关系。

**URL 参数**: `:username` - 好友的用户名

**响应**:
```json
{ "success": true, "data": { "deleted": true } }
```

**错误**:
- `404`: 用户或好友关系不存在

---

## 5. 会话管理

### `GET /api/v1/conversations`
**需要认证**。获取当前用户参与的会话列表（按最后更新时间倒序）。

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "participantIds": ["uuid", ...],
      "createdAt": "...",
      "updatedAt": "...",
      "lastMessage": { ... }
    }
  ]
}
```

---

### `POST /api/v1/conversations`
**需要认证**。创建新会话。

**请求体**:
```json
{
  "participantIds": ["uuid", "uuid", ...] (可选，默认为空数组)
}
```
注意：当前用户会自动加入会话。如果未提供 `participantIds` 或为空，则创建仅包含当前用户的单会话。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "participantIds": ["当前用户ID", ...传入的其他IDs]
  }
}
```

**错误**:
- `400`: participantIds 必须为数组（如果提供）

---

### `GET /api/v1/conversations/:id`
**需要认证**。获取会话详情（包括消息历史）。

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "participantIds": [...],
    "messages": [
      {
        "id": "uuid",
        "senderId": "uuid",
        "content": "string (Markdown)",
        "contentHtml": "string (渲染后的HTML)",
        "createdAt": "...",
        "deleted": false
      }
    ]
  }
}
```

**错误**:
- `403`: 非会话参与者
- `404`: 会话不存在

---

### `DELETE /api/v1/conversations/:id`
**需要认证**。删除会话（仅参与者）。

**响应**:
```json
{ "success": true, "data": { "deleted": true } }
```

---

## 6. 消息

### `POST /api/v1/conversations/:id/messages`
**需要认证**。在指定会话中发送消息。

**URL 参数**: `:id` - 会话 ID

**请求体**:
```json
{ "content": "string (支持 Markdown)" }
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "conversationId": "uuid",
    "senderId": "uuid",
    "content": "raw markdown",
    "contentHtml": "rendered html",
    "createdAt": "..."
  }
}
```

**错误**:
- `400`: content 必填
- `403`: 非会话参与者
- `404`: 会话不存在

---

### `GET /api/v1/conversations/:id/messages`
**需要认证**。获取会话消息历史（分页）。

**查询参数**:
- `limit` (默认 50)
- `offset` (默认 0)

**响应**:
```json
{
  "success": true,
  "data": [ ...消息数组，按时间升序... ],
  "pagination": { "total": 100, "limit": 50, "offset": 0 }
}
```

---

### `PUT /api/v1/messages/:id`
**需要认证**。编辑消息（仅发送者或管理员）。

**URL 参数**: `:id` - 消息 ID

**请求体**:
```json
{ "content": "new markdown content" }
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "...",
    "contentHtml": "...",
    "isEdited": true,
    "editedAt": "ISO8601"
  }
}
```

---

### `DELETE /api/v1/messages/:id`
**需要认证**。软删除消息（仅发送者或管理员）。

**响应**:
```json
{ "success": true, "data": { "deleted": true } }
```

---

### `POST /api/v1/messages/:id/read`
**需要认证**。标记消息为已读。

**响应**:
```json
{ "success": true, "data": { "read": true } }
```

---

## 7. 管理员 API

### `GET /api/v1/admin/stats`
**需要认证，仅管理员**。获取系统统计。

**响应**:
```json
{
  "success": true,
  "data": {
    "users": 100,
    "activeUsers": 80,
    "messages": 5000,
    "conversations": 200
  }
}
```

---

### `GET /api/v1/admin/logs`
**需要认证，仅管理员**。获取审计日志（分页与过滤）。

**查询参数**:
- `page` (默认 1)
- `limit` (默认 50)
- `action` (可选过滤)
- `targetType` (可选)
- `adminId` (可选)

**响应**:
```json
{
  "success": true,
  "data": [ ...审计日志条目... ],
  "pagination": { "page": 1, "limit": 50, "total": 500 }
}
```

---

### `GET /api/v1/admin/messages`
**需要认证，仅管理员**。搜索消息（管理监控）。

**查询参数**:
- `userId` (按发送者过滤)
- `conversationId` (按会话过滤)
- `keyword` (内容关键词，不区分大小写)
- `page`, `limit`

**响应**: 同消息列表，包含发送者和会话信息。

---

### `GET /api/v1/admin/users`
**需要认证，仅管理员**。列出所有用户（分页）。

**查询参数**: `page`, `limit`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "string",
      "displayName": "string",
      "isAdmin": false,
      "status": "active",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": { "...": "..." }
}
```

---

### `POST /api/v1/admin/users`
**需要认证，仅管理员**。创建新用户（自动生成 API Key）。

**请求体**:
```json
{
  "username": "string (必填)",
  "displayName": "string (可选)",
  "isAdmin": false,
  "status": "active"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "username": "string",
    "isAdmin": false,
    "status": "active",
    "displayName": "string",
    "apiKey": "sk-..."  // 仅在此返回
  }
}
```

---

### `GET /api/v1/admin/users/:id`
**需要认证，仅管理员**。获取用户详情。

**响应**: 用户对象（同列表字段）。

---

### `PUT /api/v1/admin/users/:id`
**需要认证，仅管理员**。更新用户信息（禁止修改自己的账号）。

**请求体** (可选字段):
```json
{
  "username": "string",
  "displayName": "string",
  "isAdmin": boolean,
  "status": "active|disabled"
}
```

---

### `DELETE /api/v1/admin/users/:id`
**需要认证，仅管理员**。软删除用户（禁止删除自己）。

**响应**: 用户对象（包含新状态）。

---

### `GET /api/v1/admin/users/:userId/friends`
**需要认证，仅管理员**。获取指定用户的好友列表。

**URL 参数**: `:userId` - 目标用户 ID

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "username": "string",
      "displayName": "string",
      "avatarUrl": "string"
    }
  ]
}
```

**错误**:
- `404`: 目标用户不存在

---

### `POST /api/v1/admin/users/:userId/friends`
**需要认证，仅管理员**。为目标用户添加好友。

**请求体**:
```json
{ "friendUsername": "string (好友的用户名)" }
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "friendship-uuid",
    "userId": "目标用户ID",
    "friendId": "好友ID",
    "status": "accepted"
  }
}
```

---

### `DELETE /api/v1/admin/users/:userId/friends/:friendId`
**需要认证，仅管理员**。移除目标用户的好友关系。

**URL 参数**:
- `:userId` - 目标用户 ID
- `:friendId` - 好友用户 ID

**响应**:
```json
{ "success": true, "data": { "deleted": true } }
```

---

## 8. 注意事项

- 所有时间戳均为 ISO 8601 格式。
- 用户删除为软删除（status 设为 `disabled`），消息删除为软删除（deleted 字段）。
- 会话参与者列表自动包含创建者。
- 消息内容经过 Markdown 渲染，原始内容存于 `content`，HTML 存于 `contentHtml`。
- 管理员操作会被记录到审计日志 (`AuditLog`)。
- 速率限制中间件已全局启用，具体限制阈值可通过环境变量配置。

---

## 9. 示例：完整对话流程

```bash
# 1. 注册
curl -X POST https://api.oujun.work/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com"}'

# 假设返回: {"success":true,"data":{"user":{...},"apiKey":"sk-xxx"}}

# 2. 用 API Key 登录（实际上注册后已有 key，这里演示登录）
curl -X POST https://api.oujun.work/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-xxx"}'

# 3. 获取当前用户信息
curl -H "Authorization: Bearer sk-xxx" \
  https://api.oujun.work/api/v1/users/me

# 4. 创建会话（假设已获取 bob 的用户 ID）
curl -X POST https://api.oujun.work/api/v1/conversations \
  -H "Authorization: Bearer sk-xxx" \
  -H "Content-Type: application/json" \
  -d '{"participantIds":["bob-uuid"]}'

# 5. 发送消息
curl -X POST https://api.oujun.work/api/v1/conversations/{conversationId}/messages \
  -H "Authorization: Bearer sk-xxx" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello **world**!"}'

# 6. 获取消息历史
curl -H "Authorization: Bearer sk-xxx" \
  "https://api.oujun.work/api/v1/conversations/{conversationId}/messages?limit=50"
```

---

## 10. 错误码汇总

| HTTP 状态码 | error 字段示例 | 说明 |
|------------|----------------|------|
| 400 | `"participantIds array required"` | 请求体缺少必填字段或类型错误 |
| 401 | `"Invalid API Key"` | API Key 无效或缺失 |
| 403 | `"Forbidden"` | 无权访问（非管理员或非资源所有者） |
| 404 | `"User not found"` / `"Conversation not found"` / `"Not Found"` | 资源不存在 |
| 409 | `"Username already taken"` / `"Friendship already exists"` | 资源冲突 |

---

*文档版本: v1.1 (2026-04-17)*