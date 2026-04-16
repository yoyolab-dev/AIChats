import { authenticate } from '../plugins/auth.js';
import { prisma } from '../plugins/prisma.js';
import bcrypt from 'bcryptjs';

export default async function (fastify, opts) {
  // All admin routes require authentication
  fastify.addHook('preHandler', authenticate);

  // Additional admin check
  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.user.isAdmin) {
      return reply.code(403).send({ success: false, error: 'Forbidden' });
    }
  });

  // GET /api/v1/admin/stats
  fastify.get('/stats', async (request, reply) => {
    const [
      usersCount,
      activeUsersCount,
      messagesCount,
      conversationsCount
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'active' } }),
      prisma.message.count({ where: { deleted: false } }),
      prisma.conversation.count()
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

  // GET /api/v1/admin/logs
  fastify.get('/logs', async (request, reply) => {
    const { page = 1, limit = 50, action, targetType, adminId } = request.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {};
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    if (adminId) where.adminId = adminId;

    const logs = await prisma.auditLog.findMany({
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

    const total = await prisma.auditLog.count({ where });

    return {
      success: true,
      data: logs,
      pagination: { page: Number(page), limit: Number(limit), total }
    };
  });

  // GET /api/v1/admin/messages
  fastify.get('/messages', async (request, reply) => {
    const { userId, conversationId, keyword, page = 1, limit = 50 } = request.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = { deleted: false };
    if (userId) where.senderId = userId;
    if (conversationId) where.conversationId = conversationId;
    if (keyword) {
      where.content = { contains: keyword, mode: 'insensitive' };
    }

    const messages = await prisma.message.findMany({
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

    const total = await prisma.message.count({ where });

    return {
      success: true,
      data: messages,
      pagination: { page: Number(page), limit: Number(limit), total }
    };
  });

  // GET /api/v1/admin/users
  fastify.get('/users', async (request, reply) => {
    const { page = 1, limit = 20 } = request.query;
    const skip = (Number(page) - 1) * Number(limit);

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip,
      select: {
        id: true,
        username: true,
        displayName: true,
        isAdmin: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    const total = await prisma.user.count();

    return {
      success: true,
      data: users,
      pagination: { page: Number(page), limit: Number(limit), total }
    };
  });

  // POST /api/v1/admin/users
  fastify.post('/users', async (request, reply) => {
    const { username, isAdmin = false, status = 'active', displayName } = request.body;

    if (!username) {
      return reply.code(400).send({ success: false, error: 'Username required' });
    }

    // Check if username already exists
    const existing = await prisma.user.findFirst({ where: { username } });
    if (existing) {
      return reply.code(409).send({ success: false, error: 'Username already exists' });
    }

    // Generate a random API key and hash it
    const apiKey = `sk-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    const hashedApiKey = await bcrypt.hash(apiKey, 10);

    const user = await prisma.user.create({
      data: {
        username,
        apiKeyHash: hashedApiKey,
        isAdmin,
        status,
        displayName
      }
    });

    // Return the plain API key only once
    return {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        isAdmin: user.isAdmin,
        status: user.status,
        displayName: user.displayName,
        apiKey // only time shown
      }
    };
  });

  // GET /api/v1/admin/users/:id
  fastify.get('/users/:id', async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.params.id },
      select: {
        id: true,
        username: true,
        displayName: true,
        isAdmin: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    return { success: true, data: user };
  });

  // PUT /api/v1/admin/users/:id
  fastify.put('/users/:id', async (request, reply) => {
    const { username, isAdmin, status, displayName } = request.body;
    const id = request.params.id;

    // Disallow changing self
    if (id === request.user.id) {
      return reply.code(403).send({ success: false, error: 'Cannot modify yourself' });
    }

    const updateData = { username, isAdmin, status, displayName };
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        isAdmin: true,
        status: true,
        displayName: true,
        updatedAt: true
      }
    });

    return { success: true, data: user };
  });

  // DELETE /api/v1/admin/users/:id
  fastify.delete('/users/:id', async (request, reply) => {
    const id = request.params.id;

    // Disallow deleting self
    if (id === request.user.id) {
      return reply.code(403).send({ success: false, error: 'Cannot delete yourself' });
    }

    // Soft delete: set status = 'deleted' (or 'disabled')
    const user = await prisma.user.update({
      where: { id },
      data: { status: 'disabled' },
      select: { id: true, username: true, status: true }
    });

    return { success: true, data: user };
  });
}
