# ADR-002: 使用 Prisma 作为 ORM 和数据迁移工具

## 状态
✅ 已采纳

## 上下文

我们需要管理 PostgreSQL 数据库的 schema，并在应用层进行类型安全的数据库访问。同时希望 migrations 可追踪、可回滚。

## 考虑的方案

- **Sequelize**: 老牌 ORM，支持多种数据库，但 TypeScript 支持一般， migrations 需要额外配置。
- **TypeORM**: 面向对象的查询方式，与 TypeScript 结合紧密，但复杂查询有时不够直观。
- **Prisma**: 新一代 ORM，提供类型安全的查询 API，schema 即代码，自动生成客户端，内置 migrations。

## 决策

采用 **Prisma** 作为数据库 ORM 和迁移工具。

### 理由

1. **类型安全**: 编译时检查字段和关联，避免运行时错误。
2. **Schema 即代码**: 用 Prisma Schema 语言定义模型，维护直观。
3. **自动生成客户端**: 根据 schema 生成 `@prisma/client`，查询 API 链式调用友好。
4. ** migrations**: 内置 `prisma migrate` 可追踪变更，便于团队协作。
5. **性能**: 高效查询生成，支持连接池。

## 后果

- 数据库 schema 变更必须通过 Prisma schema 文件并执行迁移。
- 团队需要熟悉 Prisma 的语法和查询方式。
- 应用启动时需确保数据库连接和迁移已正确运行。

---

*创建于: 2026-04-13*