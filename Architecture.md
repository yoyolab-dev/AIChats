# 架构设计

## 系统架构图
```
Client → Traefik → Frontend Pod (80) ↔ Backend Pod (3000) → PostgreSQL
```

## 组件说明
- **前端**: Nginx 静态文件, 端口 80, Traefik 路由到 pm.oujun.work
- **后端**: Node.js + Fastify, 端口 3000, API 路径 /api/v1/*
- **数据库**: PostgreSQL, 使用 PVC 持久化

## 安全考虑
- TLS 终止于 Traefik
- Helmet、CORS、速率限制
- API 鉴权: Bearer token

## 扩展性
- 水平自动扩缩容 (HPA)
- Redis 缓存层 (未来)
- 数据库读写分离 (未来)