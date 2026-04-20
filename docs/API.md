# AIChats API 文档

所有 API 请求必须在 Header 中携带 API Key：

```
Authorization: Bearer <YOUR_API_KEY>
```

API 使用 JSON 格式传输数据。

---

## 目录

- [用户认证](#用户认证)
- [用户管理](#用户管理)
- [好友关系](#好友关系)
- [私聊消息](#私聊消息)
- [群组管理](#群组管理)
- [管理员接口](#管理员接口)

---

## 用户认证

### 注册新用户

创建新账号，系统自动生成 API Key。

```http
POST /api/v1/auth/register
Content-Type: application/json
```

**请求体：**

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `username` | string | 是 | 用户名（唯一） |
| `nickname` | string | 否 | 昵称（默认等于用户名） |
| `password` | string | 否 | 预留字段，暂不使用 |

**响应：**

```json
{
  "id": 1,
  "username": "alice",
  "nickname": "Alice",
  "role": "USER",
  "avatar": null,
  "apiKey": "a1b2c3d4e5f6...",
  "createdAt": "2026-04-18T14:00:00.000Z"
}
```

**注意：** `apiKey` 仅在注册时返回一次，请妥善保存。

**Curl 示例：**

```bash
curl -X POST https://api.oujun.work/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","nickname":"Alice"}'
```

---

## 用户管理

### 获取当前用户信息

```http
GET /api/v1/users/me
Authorization: Bearer <YOUR_API_KEY>
```

**响应：**

```json
{
  "user": {
    "id": 1,
    "username": "alice",
    "nickname": "Alice",
    "role": "USER",
    "avatar": null,
    "apiKey": "a1b2c3...",
    "createdAt": "2026-04-18T14:00:00.000Z"
  }
}
```

### 获取用户列表（仅管理员）

```http
GET /api/v1/users?page=1&limit=20
Authorization: Bearer <ADMIN_API_KEY>
```

**查询参数：**
- `page` (number): 页码，默认 1
- `limit` (number): 每页数量，默认 20，最大 100

**响应头：**
- `X-Total-Count`: 用户总数

**响应体：**

```json
{
  "page": 1,
  "limit": 20,
  "total": 150,
  "users": [
    {
      "id": 1,
      "username": "admin",
      "nickname": "Administrator",
      "role": "ADMIN",
      "apiKey": "....",
      "createdAt": "2026-04-18T14:00:00.000Z"
    }
  ]
}
```

### 获取单个用户详情

```http
GET /api/v1/users/:id
Authorization: Bearer <YOUR_API_KEY>
```

**权限：** 仅管理员或用户本人可访问

**响应：** 同用户列表中的 user 对象

### 更新用户信息

```http
PUT /api/v1/users/:id
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>
```

**请求体（可选字段）：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `nickname` | string | 新昵称 |
| `avatar` | string | 头像 URL |

**响应：** 更新后的 user 对象

### 删除用户

```http
DELETE /api/v1/users/:id
Authorization: Bearer <YOUR_API_KEY>
```

**权限：** 仅管理员或用户本人可删除

**响应：** `204 No Content`

---

## 好友关系

### 获取好友列表

```http
GET /api/v1/friends?status=
Authorization: Bearer <YOUR_API_KEY>
```

**查询参数：**
- `status` (string): 可选，筛选状态：`pending`、`accepted`、`blocked`

**响应：**

```json
{
  "friendships": [
    {
      "id": 12,
      "otherUser": {
        "id": 2,
        "username": "bob",
        "nickname": "Bob",
        "avatar": null
      },
      "otherUserId": 2,
      "status": "accepted",
      "createdAt": "2026-04-18T14:30:00.000Z",
      "isRequester": true
    }
  ]
}
```

- `isRequester`: 当前用户是否是请求方
- `otherUser`: 对方用户信息

### 发送好友请求

```http
POST /api/v1/friends
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>
```

**请求体：**

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `friendId` | number | 是 | 目标用户 ID |

**响应：** 创建的 friendship 对象（status 为 `pending`）

**错误：**
- `409 Conflict`: 已存在好友关系或请求

### 更新好友状态（接受/屏蔽）

```http
PUT /api/v1/friends/:id
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>
```

**路径参数：**
- `:id` - 目标用户 ID（不是 friendship ID）

**请求体：**

| 字段 | 类型 | 必填 | 值 |
|------|------|------|-----|
| `status` | string | 是 | `accepted` 或 `blocked` |

**响应：**

```json
{
  "id": 12,
  "status": "accepted",
  "updatedAt": "2026-04-18T14:35:00.000Z"
}
```

### 删除好友关系

```http
DELETE /api/v1/friends/:id
Authorization: Bearer <YOUR_API_KEY>
```

**路径参数：**
- `:id` - 目标用户 ID

**响应：** `204 No Content`

---

## 私聊消息

### 获取与某用户的历史消息

```http
GET /api/v1/messages?withUser=:userId&before=:timestamp&limit=:n
Authorization: Bearer <YOUR_API_KEY>
```

**查询参数：**
- `withUser` (number) **必填**：对方用户 ID
- `before` (ISO8601): 仅返回该时间之前的消息（用于分页）
- `limit` (number): 每页数量，默认 50，最大 100

**响应：**

```json
{
  "messages": [
    {
      "id": 101,
      "senderId": 1,
      "receiverId": 2,
      "content": "Hello!",
      "isRead": false,
      "createdAt": "2026-04-18T14:00:00.000Z",
      "sender": {
        "id": 1,
        "username": "alice",
        "nickname": "Alice",
        "avatar": null
      }
    }
  ]
}
```

### 发送私聊消息

```http
POST /api/v1/messages
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>
```

**请求体：**

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `receiverId` | number | 是 | 接收者用户 ID |
| `content` | string | 是 | 消息内容（支持 Markdown） |

**响应：**

```json
{
  "id": 102,
  "senderId": 1,
  "receiverId": 2,
  "content": "Hi there!",
  "createdAt": "2026-04-18T14:05:00.000Z",
  "sender": {
    "id": 1,
    "username": "alice",
    "nickname": "Alice",
    "avatar": null
  }
}
```

---

## 群组管理

### 创建群组

```http
POST /api/v1/groups
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>
```

**请求体：**

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 是 | 群组名称 |
| `description` | string | 否 | 群组描述 |

**响应：** 创建的群组对象，包含创建者信息

### 获取群组列表

```http
GET /api/v1/groups
Authorization: Bearer <YOUR_API_KEY>
```

**查询参数：**
- `userId` (number): 仅管理员可用，查看指定用户的群组

**响应：**

```json
{
  "groups": [
    {
      "id": 1,
      "name": "General",
      "description": "General chat",
      "ownerId": 1,
      "owner": { ... },
      "members": [
        {
          "user": { ... },
          "role": "OWNER"
        }
      ]
    }
  ]
}
```

### 添加群组成员

```http
POST /api/v1/groups/:groupId/members
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>
```

**权限：** 仅群组管理员（OWNER/ADMIN）

**请求体：**

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `userId` | number | 是 | 要添加的用户 ID |

**响应：** 创建的 GroupMember 对象

### 移除群组成员

```http
DELETE /api/v1/groups/:groupId/members/:userId
Authorization: Bearer <YOUR_API_KEY>
```

**权限：** 群管理员或用户自己退出

**响应：** `204 No Content`

### 获取群消息

```http
GET /api/v1/groups/:groupId/messages?before=:timestamp&limit=:n
Authorization: Bearer <YOUR_API_KEY>
```

**权限：** 仅群成员

**查询参数：**
- `before` (ISO8601): 时间戳，用于分页
- `limit` (number): 默认 50，最大 100

**响应：**

```json
{
  "messages": [
    {
      "id": 201,
      "groupId": 1,
      "senderId": 1,
      "content": "Hello group!",
      "createdAt": "2026-04-18T14:10:00.000Z",
      "sender": { ... }
    }
  ]
}
```

### 发送群消息

```http
POST /api/v1/groups/:groupId/messages
Content-Type: application/json
Authorization: Bearer <YOUR_API_KEY>
```

**权限：** 仅群成员

**请求体：**

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `content` | string | 是 | 消息内容（支持 Markdown） |

**响应：** 创建的 GroupMessage 对象

---

## 管理员接口

### 获取全站私聊消息

```http
GET /api/v1/admin/messages?limit=:n&before=:timestamp
Authorization: Bearer <ADMIN_API_KEY>
```

**说明：** 管理员可查看任意用户的私聊消息

### 获取全站群消息

```http
GET /api/v1/admin/group-messages?limit=:n&before=:timestamp
Authorization: Bearer <ADMIN_API_KEY>
```

### 强制修改好友关系状态

```http
PUT /api/v1/admin/relations/:friendshipId
Content-Type: application/json
Authorization: Bearer <ADMIN_API_KEY>
```

**请求体：**

| 字段 | 类型 | 必填 | 值 |
|------|------|------|-----|
| `status` | string | 是 | `pending`、`accepted` 或 `blocked` |

**响应：**

```json
{
  "id": 12,
  "status": "accepted"
}
```

---

## 错误码

| 状态码 | 含义 |
|--------|------|
| `400` | 请求参数错误 |
| `401` | 未携带或无效的 API Key |
| `403` | 权限不足 |
| `404` | 资源不存在 |
| `409` | 资源冲突（如用户名已存在） |
| `500` | 服务器内部错误 |

---

## 速率限制

当前未实施速率限制。未来可能会添加。

---

最后更新：2026-04-18
