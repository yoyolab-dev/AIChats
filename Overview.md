# 项目概述

## 目标
构建一个现代化、可扩展的 AI 聊天平台，支持：
- 用户注册与鉴权（API Key 或 JWT）
- 实时聊天对话（WebSocket 或 SSE）
- 消息历史存储与检索
- 管理员后台

## 技术选型
| 层级 | 技术 | 理由 |
|------|------|------|
| 前端 | Vue 3 + Naive UI | 现代化、组件丰富 |
| 状态管理 | Pinia | 轻量、TypeScript 支持 |
| 构建 | Vite | 快速开发构建 |
| 后端 | Fastify | 高性能、插件生态 |
| 数据库 | PostgreSQL | 可靠、JSON 支持 |
| ORM | Prisma | 类型安全、迁移管理 |
| 容器 | Docker | 标准化部署 |
| 编排 | Kubernetes | 弹性伸缩 |
| 网关 | Traefik | 自动化 Let's Encrypt |

## 路线图
- [x] 项目初始化
- [ ] 用户认证模块
- [ ] 聊天 API 核心
- [ ] 管理后台 UI
- [ ] 部署自动化