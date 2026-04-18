import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 获取与指定用户的私聊消息
 * GET /api/v1/messages?withUser=:userId
 * Query: withUser (required), before (timestamp, optional for pagination), limit (default 50)
 */
export async function getMessagesHandler(request, reply) {
  const userId = request.user.id;
  const { withUser, before, limit = 50 } = request.query;

  if (!withUser) {
    return reply.code(400).send({ error: 'withUser query parameter is required' });
  }

  const targetUserId = parseInt(withUser);
  if (isNaN(targetUserId)) {
    return reply.code(400).send({ error: 'Invalid user ID' });
  }

  try {
    const where = {
      OR: [
        { senderId: userId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: userId }
      ],
      ...(before && { createdAt: { lt: new Date(before) } })
    };

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: { id: true, username: true, nickname: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(100, parseInt(limit))
    });

    // 反转为正序（asc）
    return reply.send({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    return reply.code(500).send({ error: 'Failed to fetch messages' });
  }
}

/**
 * 发送私聊消息
 * POST /api/v1/messages
 * Body: { receiverId: number, content: string }
 */
export async function sendMessageHandler(request, reply) {
  const senderId = request.user.id;
  const { receiverId, content } = request.body;

  if (!receiverId || !content) {
    return reply.code(400).send({ error: 'receiverId and content are required' });
  }

  try {
    // 验证接收者存在
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true }
    });
    if (!receiver) {
      return reply.code(404).send({ error: 'Receiver not found' });
    }

    const message = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        content
      },
      include: {
        sender: {
          select: { id: true, username: true, nickname: true, avatar: true }
        }
      }
    });

    // TODO: 可选广播/通知

    return reply.code(201).send(message);
  } catch (error) {
    console.error('Send message error:', error);
    return reply.code(500).send({ error: 'Failed to send message' });
  }
}
