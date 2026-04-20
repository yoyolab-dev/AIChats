# AIChats Wiki - 项目概览

## 🎉 开发阶段：Phase 1-3 已完成

截至 **2026-04-18**，项目核心后端 API 已完整实现并通过测试。

### ✅ 已完成功能

| Phase | 模块 | 状态 | 说明 |
|-------|------|------|------|
| 1 | 数据库 & ORM | ✅ | Prisma Schema 包含 6 个核心模型 |
| 1 | API Key 鉴权 | ✅ | 生成、验证中间件完成 |
| 1 | 用户 CRUD | ✅ | 注册、获取、更新、删除 |
| 2 | 好友管理 | ✅ | 添加、列表、状态更新、删除 |
| 2 | 私聊消息 | ✅ | 发送、历史获取 |
| 2 | 群组管理 | ✅ | 创建、成员、群消息 |
| 3 | 管理员 API | ✅ | 全量消息检索、强制修改关系 |

### 📱 前端架构

- **框架**：Vue 3 + Vite
- **UI 库**：Naive UI
- **路由**：Vue Router
- **HTTP**：Axios

#### 页面
- `/login` - API Key 登录
- `/chat` - 好友列表与私聊界面
- `/admin` - 管理员面板（用户查看）

---

## 🐳 部署

### 本地运行（开发）

```bash
# 后端
cd backend
npm install
cp .env.example .env  # 编辑 DATABASE_URL
npx prisma generate
npm run dev

# 前端
cd frontend
npm install
npm run dev
```

### 生产环境

- **镜像仓库**：`registry.cn-hangzhou.aliyuncs.com/geeky-explorer`
- **后端镜像**：`aichats-backend:latest`
- **前端镜像**：`aichats-frontend:latest`
- **域名**：
  - API: `https://api.oujun.work`
  - 前端: `https://pm.oujun.work`

---

## 📖 API 文档

完整接口说明请参阅：[API 页面](./API.md)

---

## 🧪 测试

运行后端测试：

```bash
cd backend
npm test
```

当前测试覆盖率：
- util（apiKey）: 100%
- routes: 集成测试进行中

---

## 📝 开发流程 (SOP)

严格遵循 8 步循环：
1. 看板同步（Todo → In Progress）
2. DDD 编码
3. 单元测试（Logic）
4. 集成测试（API）
5. 覆盖率检查
6. Commit + Push + CI
7. 部署验证
8. Wiki 同步

---

最后更新：2026-04-18 23:50
