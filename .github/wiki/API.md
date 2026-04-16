# API 文档

## 基础 URL
```
https://api.oujun.work
```

## 通用响应格式
成功:
```json
{
  "success": true,
  "data": { ... }
}
```

错误:
```json
{
  "success": false,
  "error": "ErrorName",
  "message": "Human readable error message"
}
```

## 认证
所有受保护的接口需要在 HTTP 头中包含:
```
Authorization: Bearer <api_key>
```

## 端点列表

### 健康检查
- `GET /health`
  - 返回: `{ "status": "ok", "timestamp": "ISO8601" }`

### 认证
- `POST /api/v1/auth/register`
  - 请求体: `{ "username": string, "password": string }`
  - 返回: 用户对象 (不含密码和 API Key)

- `POST /api/v1/auth/login`
  - 请求体: `{ "apiKey": string }`
  - 返回: `{ "user": { "id", "username", "displayName", "isAdmin", ... } }`

### 用户 (Users)
- `GET /api/v1/users/me` (需要认证)
  - 返回当前登录用户信息

- `GET /api/v1/users` (需要认证, 仅管理员)
  - 查询参数: `page`, `limit`
  - 返回用户列表

- `GET /api/v1/users/:id` (需要认证, 仅管理员或本人)
- `PUT /api/v1/users/:id` (需要认证, 仅管理员) - 更新用户信息 (username, displayName, status)
- `DELETE /api/v1/users/:id` (需要认证, 仅管理员) - 软删除 (status=disabled)

### 会话 (Conversations)
- `GET /api/v1/conversations`
  - 返回当前用户参与的会话列表，包含最后一条消息

- `POST /api/v1/conversations`
  - 请求体: `{ "participantIds": ["user_id1", "user_id2"] }`
  - 返回新建的会话

- `GET /api/v1/conversations/:id`
- `POST /api/v1/conversations/:id/messages`
  - 请求体: `{ "content": "string", "contentHtml?" : "string" }`

### 消息 (Messages)
- `GET /api/v1/messages` (支持筛选: `conversationId`, `userId`, `keyword`, 分页 `page`, `limit`)
- `PUT /api/v1/messages/:id` (编辑消息, 只能编辑自己的消息)
- `DELETE /api/v1/messages/:id` (软删除)
- `POST /api/v1/messages/:id/read` (标记为已读)

### 好友 (Friendships)
- `GET /api/v1/users/me/friends` (好友列表)
- `POST /api/v1/users/me/friends` (发送好友请求)
  - 请求体: `{ "friendId": "user_id" }`
- `PUT /api/v1/users/me/friends/:id` (接受/拒绝请求, 更新状态)
- `DELETE /api/v1/users/me/friends/:id` (删除好友/取消关注)

### 管理员 (Admin)
所有管理员接口需要 `isAdmin: true`

- `GET /api/v1/admin/stats` - 统计数据 (用户数、活跃用户、消息数、会话数)
- `GET /api/v1/admin/logs` - 审计日志 (分页, 可按 `action`, `targetType`, `adminId` 筛选)
- `GET /api/v1/admin/messages` - 消息监控 (可按 `userId`, `conversationId`, `keyword` 筛选)
- `GET /api/v1/admin/users` - 用户管理列表 (分页)
- `POST /api/v1/admin/users` - 创建用户
  - 请求体: `{ "username": string, "isAdmin": boolean, "status": "active|disabled", "displayName"?: string }`
  - 返回: `{ "id", "username", "isAdmin", "status", "displayName", "apiKey" }` (apiKey 仅此一次返回)
- `GET /api/v1/admin/users/:id`
- `PUT /api/v1/admin/users/:id` - 更新用户 (不能修改自己)
- `DELETE /api/v1/admin/users/:id` - 软删除 (status=disabled)

## 错误码
- `400` 请求参数错误
- `401` 未认证或 API Key 无效
- `403` 权限不足
- `404` 资源不存在
- `409` 资源冲突 (如用户名已存在)
- `500` 服务器内部错误

## 速率限制
目前未严格限制，但请勿滥用。未来可能会引入基于用户 ID 或 IP 的频率限制。

## 示例: 使用 cURL
```bash
# 登录
curl -X POST https://api.oujun.work/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"apiKey":"sk-..."}'

# 获取当前用户信息
curl https://api.oujun.work/api/v1/users/me \\
  -H "Authorization: Bearer sk-..."

# 创建会话
curl -X POST https://api.oujun.work/api/v1/conversations \\
  -H "Authorization: Bearer sk-..." \\
  -H "Content-Type: application/json" \\
  -d '{"participantIds":["user_id_1","user_id_2"]}'
```
