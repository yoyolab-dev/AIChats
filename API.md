# API 文档

## 基础 URL
```
https://api.oujun.work
```

## 通用响应
成功: `{ "success": true, "data": {...} }`
错误: `{ "success": false, "error": "...", "message": "..." }`

## 认证
```
Authorization: Bearer <api_key>
```

## 端点
- `GET /health` - 健康检查
- `POST /api/v1/auth/register` - 注册
- `POST /api/v1/auth/login` - 登录
- `POST /api/v1/chats` - 创建会话
- `POST /api/v1/chats/:id/messages` - 发送消息

详细 Schema 见各模块文档。