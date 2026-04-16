import { authenticate } from '../plugins/auth.js';
import { renderMarkdown } from '../utils/markdown.js';

export default async function (fastify, opts) {
  fastify.addHook('preHandler', authenticate);

  // POST /api/v1/conversations/:id/messages
  fastify.post('/conversations/:id/messages', async (request, reply) => {
    const { id: conversationId } = request.params;
    const { content } = request.body;

    if (!content) {
      return reply.code(400).send({ success: false, error: 'content required' });
    }

    const conversation = await request.prisma.conversation.findUnique({
      where: { id: conversationId }
    });
    if (!conversation) {
      return reply.code(404).send({ success: false, error: 'Conversation not found' });
    }
    if (!conversation.participantIds.includes(request.user.id)) {
      return reply.code(403).send({ success: false, error: 'Forbidden' });
    }

    const contentHtml = renderMarkdown(content);

    const message = await request.prisma.message.create({
      data: {
        conversationId,
        senderId: request.user.id,
        content,
        contentHtml,
      }
    });

    await request.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageId: message.id, updatedAt: new Date() }
    });

    for (const pid of conversation.participantIds) {
      if (pid !== request.user.id) {
        await request.prisma.messageRead.create({
          data: {
            messageId: message.id,
            userId: pid
          }
        }).catch(() => {});
      }
    }

    return { success: true, data: message };
  });

  // GET /api/v1/conversations/:id/messages
  fastify.get('/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params;
    const { limit = 50, offset = 0 } = request.query;

    const conversation = await request.prisma.conversation.findUnique({
      where: { id }
    });
    if (!conversation) {
      return reply.code(404).send({ success: false, error: 'Conversation not found' });
    }
    if (!conversation.participantIds.includes(request.user.id)) {
      return reply.code(403).send({ success: false, error: 'Forbidden' });
    }

    const messages = await request.prisma.message.findMany({
      where: { conversationId: id, deleted: false },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true }
        }
      }
    });

    const total = await request.prisma.message.count({
      where: { conversationId: id, deleted: false }
    });

    return {
      success: true,
      data: messages.reverse(),
      pagination: { total, limit: Number(limit), offset: Number(offset) }
    };
  });

  // PUT /api/v1/messages/:id
  fastify.put('/messages/:id', async (request, reply) => {
    const { id } = request.params;
    const { content } = request.body;
    if (!content) {
      return reply.code(400).send({ success: false, error: 'content required' });
    }

    const message = await request.prisma.message.findUnique({
      where: { id }
    });
    if (!message) {
      return reply.code(404).send({ success: false, error: 'Message not found' });
    }
    if (message.senderId !== request.user.id && !request.user.isAdmin) {
      return reply.code(403).send({ success: false, error: 'Forbidden' });
    }

    const updated = await request.prisma.message.update({
      where: { id },
      data: {
        content,
        contentHtml: renderMarkdown(content),
        isEdited: true,
        editedAt: new Date()
      }
    });
    return { success: true, data: updated };
  });

  // DELETE /api/v1/messages/:id
  fastify.delete('/messages/:id', async (request, reply) => {
    const { id } = request.params;
    const message = await request.prisma.message.findUnique({
      where: { id }
    });
    if (!message) {
      return reply.code(404).send({ success: false, error: 'Message not found' });
    }
    if (message.senderId !== request.user.id && !request.user.isAdmin) {
      return reply.code(403).send({ success: false, error: 'Forbidden' });
    }

    await request.prisma.message.update({
      where: { id },
      data: { deleted: true }
    });
    return { success: true, data: { deleted: true } };
  });

  // POST /api/v1/messages/:id/read
  fastify.post('/messages/:id/read', async (request, reply) => {
    const { id } = request.params;
    const message = await request.prisma.message.findUnique({
      where: { id }
    });
    if (!message) {
      return reply.code(404).send({ success: false, error: 'Message not found' });
    }
    const conversation = await request.prisma.conversation.findUnique({
      where: { id: message.conversationId }
    });
    if (!conversation || !conversation.participantIds.includes(request.user.id)) {
      return reply.code(403).send({ success: false, error: 'Forbidden' });
    }

    await request.prisma.messageRead.upsert({
      where: {
        messageId_userId: { messageId: id, userId: request.user.id }
      },
      update: { readAt: new Date() },
      create: { messageId: id, userId: request.user.id, readAt: new Date() }
    });
    return { success: true, data: { read: true } };
  });
}
