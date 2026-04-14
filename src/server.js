import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import { prismaPlugin } from './plugins/prisma.js';
import { authenticate } from './plugins/auth.js';
import { rateLimitPlugin } from './plugins/rateLimit.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import conversationRoutes from './routes/conversations.js';
import messageRoutes from './routes/messages.js';
import friendshipRoutes from './routes/friendships.js';
import adminRoutes from './routes/admin.js';

const app = Fastify({ logger: true });

await app.register(fastifyCors, { origin: '*' });
await app.register(fastifyHelmet);
await app.register(prismaPlugin);
await app.register(rateLimitPlugin, { keyGenerator: (req) => req.user?.id?.toString() || req.ip });

app.register(authRoutes, { prefix: '/api/v1/auth' });
app.register(userRoutes, { prefix: '/api/v1/users' });
app.register(conversationRoutes, { prefix: '/api/v1/conversations' });
app.register(messageRoutes, { prefix: '/api/v1' });
app.register(friendshipRoutes, { prefix: '/api/v1/users/me' });
app.register(adminRoutes, { prefix: '/api/v1/admin' });

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
app.setNotFoundHandler((req, reply) => reply.code(404).send({ success: false, error: 'Not Found' }));
app.setErrorHandler(async (error, req, reply) => {
  app.log.error(error);
  reply.code(error.status || 500).send({ success: false, error: error.name || 'InternalServerError', message: error.message || 'Internal server error' });
});

// Only start server if run directly
if (process.argv[1] === `file://${__filename}`) {
  const port = process.env.PORT || 3000;
  await app.listen({ port });
  console.log(`🚀 Server listening on http://localhost:${port}`);
}

export { app };