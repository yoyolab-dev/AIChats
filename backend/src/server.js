import Fastify from 'fastify';
import { authMiddleware } from './plugins/auth.js';
import * as usersRoutes from './routes/users.routes.js';

const fastify = Fastify({
  logger: true,
});

// 注册路由

// 认证路由（无需鉴权）
fastify.post('/api/v1/auth/register', usersRoutes.registerHandler);

// 受保护的用户路由（需要鉴权）
fastify.get('/api/v1/users/me', { onRequest: [authMiddleware] }, usersRoutes.getMeHandler);
fastify.get('/api/v1/users', { onRequest: [authMiddleware] }, usersRoutes.listUsersHandler);
fastify.get('/api/v1/users/:id', { onRequest: [authMiddleware] }, usersRoutes.getUserHandler);
fastify.put('/api/v1/users/:id', { onRequest: [authMiddleware] }, usersRoutes.updateUserHandler);
fastify.delete('/api/v1/users/:id', { onRequest: [authMiddleware] }, usersRoutes.deleteUserHandler);

// 健康检查
fastify.get('/health', async () => ({ status: 'ok' }));

// 404 处理
fastify.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ error: 'Not found' });
});

// 全局错误处理
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.code(500).send({ error: 'Internal server error' });
});

const start = async () => {
  try {
    const host = process.env.HOST || '0.0.0.0';
    const port = process.env.PORT || 8200;

    await fastify.listen({ host, port });
    console.log(`🚀 Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
