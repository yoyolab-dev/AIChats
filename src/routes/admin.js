import { Router } from 'fastify';
import { authenticate } from '../plugins/auth.js';

const router = Router();
router.addHook('preHandler', authenticate);

// All admin routes require isAdmin
router.addHook('preHandler', async (request, reply, done) => {
  if (!request.user.isAdmin) {
    return reply.code(403).send({ success: false, error: 'Forbidden' });
  }
  done();
});

// GET /api/v1/admin/stats - System statistics
router.get('/stats', async (request, reply) => {
  const [
    usersCount,
    activeUsersCount,
    messagesCount,
    conversationsCount
  ] = await Promise.all([
    request.prisma.user.count(),
    request.prisma.user.count({ where: { status: 'active' } }),
    request.prisma.message.count({ where: { deleted: false } }),
    request.prisma.conversation.count()
  ]);

  return {
    success: true,
    data: {
      users: usersCount,
      activeUsers: activeUsersCount,
      messages: messagesCount,
      conversations: conversationsCount
    }
  };
});

// GET /api/v1/admin/logs - Audit logs
router.get('/logs', async (request, reply) => {
  const { page = 1, limit = 50, action, targetType, adminId } = request.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {};
  if (action) where.action = action;
  if (targetType) where.targetType = targetType;
  if (adminId) where.adminId = adminId;

  const logs = await request.prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    skip,
    include: {
      admin: {
        select: { id: true, username: true, displayName: true }
      }
    }
  });

  const total = await request.prisma.auditLog.count({ where });

  return {
    success: true,
    data: logs,
    pagination: { page: Number(page), limit: Number(limit), total }
  };
});

// GET /api/v1/admin/messages - Query all messages (for monitoring)
router.get('/messages', async (request, reply) => {
  const { userId, conversationId, keyword, page = 1, limit = 50 } = request.query;
  const skip = (Number(page) - 1) * Number(limit);

  const where = { deleted: false };
  if (userId) where.senderId = userId;
  if (conversationId) where.conversationId = conversationId;
  if (keyword) {
    // Simple text search on content
    where.content = { contains: keyword, mode: 'insensitive' };
  }

  const messages = await request.prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
    skip,
    include: {
      sender: {
        select: { id: true, username: true, displayName: true }
      },
      conversation: {
        select: { id: true, participantIds: true }
      }
    }
  });

  const total = await request.prisma.message.count({ where });

  return {
    success: true,
    data: messages,
    pagination: { page: Number(page), limit: Number(limit), total }
  };
});

export default router;