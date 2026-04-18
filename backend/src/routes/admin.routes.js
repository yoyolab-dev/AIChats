import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 管理员获取全站私聊消息
 * GET /api/v1/admin/messages?limit=100&before=?
 */
export async function getAllMessagesHandler(request, reply) {
  if (request.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden' });
  }

  const { limit = 100, before } = request.query;

  try {
    const where = {
      ...(before && { createdAt: { lt: new Date(before) } })
    };

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, username: true, nickname: true, avatar: true }
        },
        receiver: {
          select: { id: true, username: true, nickname: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(500, parseInt(limit))
    });

    return reply.send({ messages: messages.reverse() });
  } catch (error) {
    console.error('Admin getAllMessages error:', error);
    return reply.code(500).send({ error: 'Failed to fetch all messages' });
  }
}

/**
 * 管理员获取全站群消息
 * GET /api/v1/admin/group-messages?limit=100&before=?
 */
export async function getAllGroupMessagesHandler(request, reply) {
  if (request.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden' });
  }

  const { limit = 100, before } = request.query;

  try {
    const where = {
      ...(before && { createdAt: { lt: new Date(before) } })
    };

    const messages = await prisma.groupMessage.findMany({
      where,
      include: {
        sender: {
          select: { id: true, username: true, nickname: true, avatar: true }
        },
        group: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(500, parseInt(limit))
    });

    return reply.send({ messages: messages.reverse() });
  } catch (error) {
    console.error('Admin getAllGroupMessages error:', error);
    return reply.code(500).send({ error: 'Failed to fetch group messages' });
  }
}

/**
 * 管理员强制修改好友关系
 * PUT /api/v1/admin/relations/:friendshipId
 * Body: { status: 'accepted'|'blocked'|'pending' }
 */
export async function adminUpdateFriendshipHandler(request, reply) {
  if (request.user.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden' });
  }

  const { friendshipId } = request.params;
  const { status } = request.body;

  if (!['PENDING', 'ACCEPTED', 'BLOCKED'].includes(status?.toUpperCase())) {
    return reply.code(400).send({ error: 'Invalid status' });
  }

  try {
    const friendship = await prisma.friendship.update({
      where: { id: parseInt(friendshipId) },
      data: { status: status.toUpperCase() }
    });

    return reply.send({ id: friendship.id, status: friendship.status });
  } catch (error) {
    if (error.code === 'P2025') {
      return reply.code(404).send({ error: 'Friendship not found' });
    }
    console.error('Admin update friendship error:', error);
    return reply.code(500).send({ error: 'Failed to update friendship' });
  }
}
