import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { prismaPlugin } from './plugins/prisma.js';
import { authenticate } from './plugins/auth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import friendshipRoutes from './routes/friendships.js';
import adminRoutes from './routes/admin.js';

const app = Fastify({
  logger: true,
});

// Global plugins
await app.register(fastifyCors, {
  origin: '*', // TODO: from env
});
await app.register(fastifyHelmet);
await app.register(prismaPlugin);

// Public routes (no auth)
app.register(authRoutes, { prefix: '/api/v1/auth' });

// Protected routes (require authentication)
app.register(userRoutes, { prefix: '/api/v1/users' });
app.register(conversationRoutes, { prefix: '/api/v1/conversations' });
app.register(messageRoutes, { prefix: '/api/v1' });
app.register(friendshipRoutes, { prefix: '/api/v1/users/me' });
app.register(adminRoutes, { prefix: '/api/v1/admin' });

// Health check
app.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// 404 handler
app.setNotFoundHandler((request, reply) => {
  reply.code(404).send({ success: false, error: 'Not Found' });
});

// Error handler
app.setErrorHandler(async (error, request, reply) => {
  app.log.error(error);
  reply.code(error.status || 500).send({
    success: false,
    error: error.name || 'InternalServerError',
    message: error.message || 'Internal server error',
  });
});

const port = process.env.PORT || 3000;
await app.listen({ port });
console.log(`🚀 Server listening on http://localhost:${port}`);