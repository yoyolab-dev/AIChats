import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { authMiddleware } from './plugins/auth.js';
import * as usersRoutes from './routes/users.routes.js';
import * as friendshipsRoutes from './routes/friendships.routes.js';
import * as messagesRoutes from './routes/messages.routes.js';
import * as groupsRoutes from './routes/groups.routes.js';
import * as adminRoutes from './routes/admin.routes.js';

const fastify = Fastify({
  logger: true,
});

// 启用 CORS（允许任何来源，便于开发；生产环境可限制）
fastify.register(require('@fastify/cors'), { origin: true, credentials: true });

// 注册路由

// 认证路由（无需鉴权）
fastify.post('/api/v1/auth/register', usersRoutes.registerHandler);

// 受保护的用户路由（需要鉴权）
fastify.get('/api/v1/users/me', { onRequest: [authMiddleware] }, usersRoutes.getMeHandler);
fastify.get('/api/v1/users', { onRequest: [authMiddleware] }, usersRoutes.listUsersHandler);
fastify.get('/api/v1/users/:id', { onRequest: [authMiddleware] }, usersRoutes.getUserHandler);
fastify.put('/api/v1/users/:id', { onRequest: [authMiddleware] }, usersRoutes.updateUserHandler);
fastify.delete('/api/v1/users/:id', { onRequest: [authMiddleware] }, usersRoutes.deleteUserHandler);

// 好友路由（需要鉴权）
fastify.get('/api/v1/friends', { onRequest: [authMiddleware] }, friendshipsRoutes.listFriendsHandler);
fastify.post('/api/v1/friends', { onRequest: [authMiddleware] }, friendshipsRoutes.sendFriendRequestHandler);
fastify.put('/api/v1/friends/:id', { onRequest: [authMiddleware] }, friendshipsRoutes.updateFriendStatusHandler);
fastify.delete('/api/v1/friends/:id', { onRequest: [authMiddleware] }, friendshipsRoutes.deleteFriendHandler);

// 消息路由（需要鉴权）
fastify.get('/api/v1/messages', { onRequest: [authMiddleware] }, messagesRoutes.getMessagesHandler);
fastify.post('/api/v1/messages', { onRequest: [authMiddleware] }, messagesRoutes.sendMessageHandler);

// 群组路由（需要鉴权）
fastify.post('/api/v1/groups', { onRequest: [authMiddleware] }, groupsRoutes.createGroupHandler);
fastify.get('/api/v1/groups', { onRequest: [authMiddleware] }, groupsRoutes.listGroupsHandler);
fastify.post('/api/v1/groups/:groupId/members', { onRequest: [authMiddleware] }, groupsRoutes.addGroupMemberHandler);
fastify.delete('/api/v1/groups/:groupId/members/:userId', { onRequest: [authMiddleware] }, groupsRoutes.removeGroupMemberHandler);
fastify.get('/api/v1/groups/:groupId/messages', { onRequest: [authMiddleware] }, groupsRoutes.getGroupMessagesHandler);
fastify.post('/api/v1/groups/:groupId/messages', { onRequest: [authMiddleware] }, groupsRoutes.sendGroupMessageHandler);

// 管理员路由（需要鉴权 + 角色检查）
fastify.get('/api/v1/admin/messages', { onRequest: [authMiddleware] }, adminRoutes.getAllMessagesHandler);
fastify.get('/api/v1/admin/group-messages', { onRequest: [authMiddleware] }, adminRoutes.getAllGroupMessagesHandler);
fastify.put('/api/v1/admin/relations/:friendshipId', { onRequest: [authMiddleware] }, adminRoutes.adminUpdateFriendshipHandler);

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
