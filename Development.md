# 开发规范

## 分支策略
- `main`: 稳定版
- `feature/*`: 新功能
- `bugfix/*`: 修复
- `hotfix/*`: 紧急修复

## 提交规范 (Conventional Commits)
类型: feat, fix, docs, style, refactor, perf, test, chore
示例: `feat(chat): add streaming support`

## 代码风格
- 前端 Vue 3 + TS: `<script setup>`, PascalCase 组件
- 后端 Fastify: ES 模块, routes 按模块组织, services 抽离逻辑
- Docker: 多阶段构建, 仅复制必要文件

## 环境变量
`.env` 文件管理, 提供 `.env.example`:
```
NODE_ENV, PORT, DATABASE_URL, JWT_SECRET, ALIYUN_*
```

## PR 流程
1. 创建分支
2. 开发并测试
3. 提交规范信息
4. Push 并创建 PR
5. 至少一名维护者 Approve
6. CI 通过后 Squash merge

## CI/CD
GitHub Actions: Lint → Type check → Test → Build/Push → Deploy (仅 main)

## 测试目标
覆盖率 >= 80%