import fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import { authPlugin } from './plugins/auth';
import { adminPlugin } from './plugins/admin';
import { wsManager } from './services/wsManager';
import { metricsPlugin } from './plugins/metrics';
import { usersRoutes } from './routes/users';
import { friendsRoutes } from './routes/friends';
import { chatRoutes } from './routes/chat';
import { groupsRoutes } from './routes/groups';
import { adminRoutes } from './routes/admin';

// 全局暴露 WS 管理器 (供 metrics 使用)

global.wsManager = wsManager;

// 加载环境变量
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildApp() {
  const app = fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // 注册插件
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  });

  await app.register(websocket);

  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    keyGenerator: (req) => req.user?.id || req.ip,
  });

  await app.register(metricsPlugin);

  await app.register(authPlugin);
  // 装饰 authenticateAdmin 方法
  app.decorate('authenticateAdmin', async (request: any, reply: any) => {
    if (request.user?.role !== 'ADMIN') {
      throw app.httpErrors.forbidden('Admin access required');
    }
  });

  // 注册路由
  await app.register(usersRoutes);
  await app.register(friendsRoutes);
  await app.register(chatRoutes);
  await app.register(groupsRoutes);
  await app.register(adminRoutes);

  // 健康检查
  app.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // WebSocket 路由
  app.get('/ws', { websocket: true }, (connection, request) => {
    const userId = request.user?.id;
    if (!userId) {
      connection.socket.close(4001, 'Unauthorized');
      return;
    }

    wsManager.register(userId, connection.socket);
    connection.socket.send(JSON.stringify({ type: 'connected' }));

    // 心跳处理
    connection.socket.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'ping') {
          connection.socket.send(JSON.stringify({ type: 'pong' }));
          wsManager.updatePong(userId, connection.socket);
        }
      } catch (e) {
        // 忽略无效消息
      }
    });

    connection.socket.on('close', () => {
      wsManager.unregister(userId, connection.socket);
    });
  });

  // 404 处理
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      error: { code: 1004, message: 'Resource not found' },
    });
  });

  // 错误处理
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);

    if (error.name === 'ZodError') {
      return reply.code(400).send({
        success: false,
        error: { code: 1001, message: 'Validation error', details: error },
      });
    }

    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        success: false,
        error: { code: error.statusCode, message: error.message },
      });
    }

    // 内部服务器错误
    reply.code(500).send({
      success: false,
      error: { code: 1099, message: 'Internal server error' },
    });
  });

  // 启动心跳检查间隔 (每 60 秒)
  setInterval(() => {
    const timedOut = wsManager.checkTimeouts(60000);
    if (timedOut > 0) {
      app.log.warn(`[WS] Cleaned up ${timedOut} timed out connections`);
    }
  }, 60000);

  return app;
}

// 导出供测试使用
export { buildApp };

// 非测试环境才启动服务器
if (process.env.NODE_ENV !== 'test') {
  buildApp()
  .then((app) => {
    const port = parseInt(process.env.PORT || '8200', 10);
    const host = process.env.HOST || '0.0.0.0';

    app.listen({ port, host }, (err, address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      console.log(`🚀 Server listening at ${address}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}