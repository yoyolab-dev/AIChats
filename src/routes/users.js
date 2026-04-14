import { Router } from 'fastify';
import { authenticate } from '../plugins/auth.js';

const router = Router();

// All user routes require authentication
router.addHook('preHandler', authenticate);

// Example: GET /api/v1/users/me
router.get('/me', async (request, reply) => {
  const user = await request.prisma.user.findUnique({
    where: { id: request.user.id },
    select: { id: true, username: true, displayName: true, avatarUrl: true, isAdmin: true, status: true }
  });
  return { success: true, data: user };
});

// Admin only: GET /api/v1/users (list all)
router.get('/', async (request, reply) => {
  if (!request.user.isAdmin) {
    return reply.code(403).send({ success: false, error: 'Forbidden' });
  }
  const users = await request.prisma.user.findMany({
    select: { id: true, username: true, displayName: true, isAdmin: true, status: true, createdAt: true }
  });
  return { success: true, data: users };
});

// GET /api/v1/users/:id
router.get('/:id', async (request, reply) => {
  const { id } = request.params;
  // Only allow self or admin
  if (request.user.id !== id && !request.user.isAdmin) {
    return reply.code(403).send({ success: false, error: 'Forbidden' });
  }
  const user = await request.prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, displayName: true, avatarUrl: true, isAdmin: true, status: true }
  });
  if (!user) return reply.code(404).send({ success: false, error: 'User not found' });
  return { success: true, data: user };
});

// PUT /api/v1/users/:id (update)
router.put('/:id', async (request, reply) => {
  const { id } = request.params;
  if (request.user.id !== id && !request.user.isAdmin) {
    return reply.code(403).send({ success: false, error: 'Forbidden' });
  }
  const { displayName, avatarUrl, status } = request.body;
  const user = await request.prisma.user.update({
    where: { id },
    data: { displayName, avatarUrl, status },
    select: { id: true, username: true, displayName: true, avatarUrl: true, status: true }
  });
  return { success: true, data: user };
});

// DELETE /api/v1/users/:id (soft delete)
router.delete('/:id', async (request, reply) => {
  const { id } = request.params;
  if (request.user.id !== id && !request.user.isAdmin) {
    return reply.code(403).send({ success: false, error: 'Forbidden' });
  }
  await request.prisma.user.update({
    where: { id },
    data: { status: 'disabled' }
  });
  return { success: true, data: { deleted: true } };
});

export default router;